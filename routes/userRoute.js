import express from "express";
import { allUsers, deleteUser, findUser, forgotPassword, login, logout, myProfile, register, resetPassword, updateEmail, updatePassword, updateProfile, updateRole, usersInfinite, verifyEmail } from "../controller/userController.js";
import { isAdmin, isAuthenticatedUser } from "../middelware/auth.js";
import singleUpload from "../middelware/multer.js";


const router = express.Router();

router.route("/register").post(singleUpload,register)

// router.route("/registernew").post(multiUpload,registerManyImages)

router.route("/login").post(login)

router.route("/logout").get(logout)

router.route("/password/forgot").post(forgotPassword)

router.route("/password/reset/:token").put(resetPassword)

router.route("/me").get(isAuthenticatedUser,myProfile)

router.route("/me/update").put(isAuthenticatedUser, updateProfile)

router.route("/password/update").put(isAuthenticatedUser, updatePassword)

router.route("/verify/:token").get(verifyEmail)

router.route("/update/email").put(isAuthenticatedUser, updateEmail)






// Admin Routes
router.route("/admin/allusers").get(isAuthenticatedUser,isAdmin,usersInfinite)

router.route("/admin/users").get(isAuthenticatedUser,isAdmin,allUsers)

router.route("/admin/user/:id").delete(isAuthenticatedUser, isAdmin, deleteUser).get(isAuthenticatedUser, isAdmin, findUser).put(isAuthenticatedUser, isAdmin, updateRole)

export default router