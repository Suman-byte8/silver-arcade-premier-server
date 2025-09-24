// server/config/mail/membership/sendMembershipRejectionEmail.js
const transporter = require('../transporter');

const sendMembershipRejectionEmail = async (membership) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: membership.email,
      subject: `Update on Your Membership Application - Silver Arcade Premier`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
        <div style="background: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 3px 12px rgba(0,0,0,0.08);">
          
          <h2 style="color: #cc0000; text-align: center; margin-bottom: 25px;">Membership Application Update</h2>
          
          <p style="font-size: 15px; line-height: 1.6; color: #555;">
            Dear ${membership.firstName},
          </p>
          
          <p style="font-size: 15px; line-height: 1.6; color: #555;">
            Thank you very much for your interest in becoming a Silver Arcade Premier Member and for the time you spent applying. 
          </p>
          
          <p style="font-size: 15px; line-height: 1.6; color: #555;">
            After careful review, we regret to inform you that at this time, your application has not been approved. Please note that this decision does not reflect negatively on your potential or enthusiasm — and we would be pleased to reconsider should you wish to reapply in the future.
          </p>
          
          <p style="font-size: 15px; line-height: 1.6; color: #555;">
            We truly value your interest in our community, and we encourage you to stay connected through our events, updates, and exclusive programs. 
          </p>
          
          <p style="margin-top: 20px; font-size: 14px; color: #777;">
            For feedback or inquiries regarding your application, feel free to reach out at 📧 mdshabib1993@gmail.com or 📞 +7719381841.
          </p>
          
          <p style="font-size: 14px; margin-top: 25px; color: #777;">
            Best Regards,<br/>
            <b>Team Silver Arcade Premier</b>
          </p>
        </div>
      </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Membership rejection email sent successfully to: ${membership.email}`);
  } catch (error) {
    console.error("❌ Error sending membership rejection email:", error);
  }
};

module.exports = sendMembershipRejectionEmail;