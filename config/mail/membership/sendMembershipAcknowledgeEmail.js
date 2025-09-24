// server/config/mail/membership/sendMembershipConfirmationEmail.js
const transporter = require('../transporter');

const sendMembershipConfirmationEmail = async (membership) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: membership.email,
      subject: '🎉 Thank You for Applying - Silver Arcade Premier Membership!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">Thank you for applying!</h2>
          <p>Dear ${membership.firstName} ${membership.lastName},</p>
          <p>We have received your membership request. Our specialists will reach out shortly via call or email.</p>
          <br/>
          <p style="color:#555;font-size:14px;">Silver Arcade Premier - Malda, WB</p>
          <p>📞 +7719381841 | 📧 mdshabib1993@gmail.com</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Membership application email sent to:', membership.email);
  } catch (err) {
    console.error('Error sending membership email:', err);
  }
};

module.exports = sendMembershipConfirmationEmail;