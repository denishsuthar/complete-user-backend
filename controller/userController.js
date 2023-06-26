import { User, generateToken } from "../model/userModel.js";
import catchAsyncError from "../middelware/catchAsyncError.js"
import ErrorHandler from "../utils/errorHandler.js"
import sendToken from "../utils/sendToken.js"
import sendEmail from "../utils/sendEmail.js";
import crypto from "crypto"
import {generateUniqueUsername, generateUsername} from "../utils/userName.js";
import sendVerificationEmail from "../utils/sendVerificationEmail.js";

// Register User
export const register = catchAsyncError(async(req, res, next)=>{
    const {name, email, password, mobileNumber} = req.body
    const avatar = req.file
    if(!name || !email || !password || !mobileNumber || !avatar) return next(new ErrorHandler("Please Enter All Fields", 400));

    let user = await User.findOne({email})
    if(user) return next(new ErrorHandler("User Already Registered, Please Login", 400));

    // Generate verification token
    const verificationToken = generateToken();
    sendVerificationEmail(email, verificationToken)

    // Generating UserName
    let userName = generateUsername(name);
    let usernameExists = true;
    let counter = 1;

    while (usernameExists){
        const existingUser = await User.findOne({ userName });
        if (existingUser) {
            userName = generateUniqueUsername(name, counter);
            counter++;
          } else{
            user = await User.create({
                name, email, password, mobileNumber, avatar, userName
            })
            sendToken(res, user, "Registred Successfully, Please Verify your Email", 201)
            usernameExists = false;
          }
    }
})

// export const register = catchAsyncError(async (req, res, next) => {
//   const { name, email, password, mobileNumber } = req.body;
//   const avatar = req.file;

//   if (!name || !email || !password || !mobileNumber || !avatar) {
//     return next(new ErrorHandler("Please Enter All Fields", 400));
//   }

//   try {
//     let user = await User.findOne({ email });

//     if (user) {
//       return next(new ErrorHandler("User Already Registered, Please Login", 400));
//     }

//     // Generate verification token
//     const verificationToken = generateToken();
//     const verificationUrl = `${req.protocol}://${req.get("host")}/api/v1/verify/${verificationToken}`;

//     const message = `Please click the following link to verify your email:\n\n${verificationUrl}\n\nIf you have not requested this email, please ignore it.`;

//     await sendEmail({
//       email,
//       subject: "Verification Email",
//       message,
//     });

//     // Generating UserName
//     let userName = generateUsername(name);
//     let usernameExists = true;
//     let counter = 1;

//     while (usernameExists) {
//       const existingUser = await User.findOne({ userName });

//       if (existingUser) {
//         userName = generateUniqueUsername(name, counter);
//         counter++;
//       } else {
//         user = await User.create({
//           name,
//           email,
//           password,
//           mobileNumber,
//           avatar,
//           userName,
//         });

//         return sendToken(res, user, "Registered Successfully, Please Verify your Email", 201);
//       }
//     }
//   } catch (error) {
//     return next(new ErrorHandler(error.message, 500));
//   }
// });


// Verifying Email Verification Token
export const verifyEmail = catchAsyncError(async(req,res,next)=>{
  // Verify email when user registred
    // const {token} = req.params.token;

    // const user = await User.findOneAndUpdate(
    //     {verificationToken: token, emailVerified: false},
    //     {$set: { emailVerified: true }, $unset: { verificationToken: 1 }},
    //     {new: true}
    // )
    // if(!user) return next(new ErrorHandler("Invalid Token or Email Already Verified", 404))

    // res.status(200).json({
    //     success:true,
    //     message:"Email Verified Successfully"
    // })

    // verify both current and new Email
    const { token } = req.params.token;

    const user = await User.findOne({
        $or: [
          { verificationToken: token, emailVerified: false },
          { newEmailVerificationToken: token, newEmailVerified: false },
        ],
      });
    
      if (!user) {
        return next(new ErrorHandler('Invalid verification token or email already verified.', 404));
      }
    
      if (user.verificationToken === token && !user.emailVerified) {
        // Verify the current email
        await User.updateOne(
          { _id: user._id },
          {
            $set: {
              emailVerified: true,
            },
            $unset: {
              verificationToken: 1,
            },
          }
        );
      }
    
      if (user.newEmailVerificationToken === token && !user.newEmailVerified) {
        // Verify the new email
        await User.updateOne(
          { _id: user._id },
          {
            $set: {
              email: user.newEmail,
              emailVerified: true,
            },
            $unset: {
              newEmail: 1,
              newEmailVerified: 1,
              newEmailVerificationToken: 1,
              verificationToken: 1,
            },
          }
        );
      }
    
      res.status(200).json({
        success: true,
        message: 'Email verified successfully.',
      });

})



// export const registerManyImages = catchAsyncError(async(req, res, next)=>{
//     const {name, email, password, mobileNumber} = req.body
//     const images = req.files
//     if(!name || !email || !password || !mobileNumber || !images) return next(new ErrorHandler("Please Enter All Fields", 400));

//     let user = await User.findOne({email})
//     if(user) return next(new ErrorHandler("User Already Registered, Please Login", 400));

//     user = await User.create({
//         name, email, password, mobileNumber, images
//     })

//     sendToken(res, user, "Registred Successfully", 201)
// })

// Login User
export const login = catchAsyncError(async(req, res, next)=>{
    const {email, password} = req.body
    if(!email || !password) return next(new ErrorHandler("Please Enter All Fields", 400))

    const user = await User.findOne({email}).select("+password")
    if(!user) return next(new ErrorHandler("Incorrect Email", 401))

    const isMatch = await user.comparePassword(password);
    if(!isMatch) return next(new ErrorHandler("Incorrect Password", 401));

    // Check if the user's Email is verified
    if(!user.emailVerified){
        return next(new ErrorHandler("Please Verify Your Email to Login", 403))
    }

    sendToken(res, user, `Welcome Back ${user.name}`, 200);
})

// Logout User
export const logout = catchAsyncError(async(req, res, next)=>{
    res.status(200).cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly:true,
        // secure:true,
        // sameSite:"none"
    }).json({
        success:true,
        message:"Logout SuccessFully"
    })
})

// Forgot Password
export const forgotPassword = catchAsyncError(async(req, res,next)=>{
    const user = await User.findOne({email:req.body.email})
    if(!user) return next(new ErrorHandler("User Not Found", 404));

    // Get ResetPassword Token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    const resetPasswordUrl = `${req.protocol}://${req.get("host")}/api/v1/password/reset/${resetToken}`;

    const message = `Your password reset token is :- \n\n ${resetPasswordUrl} \n\nIf you have not requested this email then, please ignore it.`;

    try {
        await sendEmail({
          email: user.email,
          subject: `Password Recovery`,
          message,
        });
    
        res.status(200).json({
          success: true,
          message: `Email sent to ${user.email} successfully`,
        });
      } catch (error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
    
        await user.save({ validateBeforeSave: false });
    
        return next(new ErrorHandler(error.message, 500));
      }
})

// Reset Password
export const resetPassword = catchAsyncError(async(req, res, next)=>{
    // Creating Token Hash
    const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {return next(new ErrorHandler("Reset Password Token is invalid or has been expired",400));
  }

  if (req.body.password !== req.body.confirmPassword) {
    return next(new ErrorHandler("Password is not match", 400));
  }
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  sendToken(res, user, "Password Reset Succesfully", 200)
})

// Get Login User Profile
export const myProfile = catchAsyncError(async(req,res,next)=>{
    const user = await User.findById(req.user.id)
    // Check if the user is verified
    if(!user.emailVerified){
        return next(new ErrorHandler("Please Verify Your Email to Access this Resource", 403))
    }
    res.status(200).json({
        success:true,
        user
    })
})

// Update User Profile
export const updateProfile = catchAsyncError(async(req,res,next)=>{
    const {name, mobileNumber} = req.body

    const user = await User.findById(req.user.id);
    if(name) user.name = name;
    if(mobileNumber) user.mobileNumber = mobileNumber;

    await user.save();

    res.status(200).json({
        success:true,
        message:"Profile Updated Successfully",
        user
    })
})

// Update Email
export const updateEmail = catchAsyncError(async(req,res,next)=>{
    const userId = req.user.id
    const { newEmail } = req.body;

    const verificationToken = generateToken();

    User.findByIdAndUpdate(userId, { newEmail, newEmailVerified: false, verificationToken })
    .then(() => {
      sendVerificationEmail(newEmail, verificationToken);

      res.json({ message: 'Email update initiated. Please check your new email for verification.' });
    })
    .catch((error) => {
      res.status(500).json({ error: 'Failed to update email.' });
    });

})

// Update User Password
export const updatePassword = catchAsyncError(async(req, res, next)=>{
    const {oldPassword, newPassword} = req.body
    if(!oldPassword || !newPassword) return next(new ErrorHandler("Please Fill All Fields", 400));

    const user = await User.findById(req.user._id).select("+password");

    const isMatch = await user.comparePassword(oldPassword);
    if(!isMatch) return next(new ErrorHandler("Old Password Incorrect", 400));

    user.password = newPassword;
    
    await user.save();

    res.status(200).json({
        success:true,
        message:"Password Changed Successfully"
    })
})

// Get All Users --Admin
export const allUsers = catchAsyncError(async(req,res,next)=>{
    const users = await User.find().sort({ _id: -1 })
    res.status(200).json({
        success:true,
        users
    })
})

// Get Any User Profile --Admin
export const findUser = catchAsyncError(async(req, res, next)=>{
    const user = await User.findById(req.params.id)
    if(!user) return next(new ErrorHandler("User Not Found", 404));
    res.status(200).json({
        success:true,
        user
    })
})

// Update User Role --Admin
export const updateRole = catchAsyncError(async(req, res, next)=>{
    const user = await User.findById(req.params.id);
    if(!user) return next(new ErrorHandler("User Not Found", 404));

    if(user.role === "user") user.role = "admin";
    else user.role = "user";

    await user.save();

    res.status(200).json({
        success:true,
        message:"Role Updated"
    })
})

// Delete User --Admin
export const deleteUser = catchAsyncError(async(req, res, next)=>{
    const user = await User.findById(req.params.id)
    if(!user) return next(new ErrorHandler("User Not Found", 404));

    await user.deleteOne();

    res.status(200).json({
        success:true,
        message:"User Deleted Successfully"
    })
})


// All Users Infinite
export const usersInfinite = catchAsyncError(async(req, res, next)=>{
    const skip =  req.query.skip && /^\d+$/.test(req.query.skip) ? Number(req.query.skip) : 0
    const users = await User.find({}, undefined, {skip, limit:5}).sort({ _id: -1 })
    res.status(200).json({
        users
    })
})