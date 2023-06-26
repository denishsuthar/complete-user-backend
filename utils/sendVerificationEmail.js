import nodemailer from "nodemailer"

function sendVerificationEmail(email, token) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMPT_HOST,
    port: process.env.SMPT_PORT,
    service: process.env.SMPT_SERVICE,
    auth: {
      user: process.env.SMPT_MAIL,
      pass: process.env.SMPT_PASSWORD,
    }
  });

  const mailOptions = {
    from: process.env.SMPT_MAIL,
    to: email,
    subject: 'Email Verification',
    text:`Please click the following link to verify your email: http://localhost:5000/api/v1/verify/${token}`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending verification email', error);
    } else {
      console.log('Verification email sent');
    }
  });
}
export default sendVerificationEmail