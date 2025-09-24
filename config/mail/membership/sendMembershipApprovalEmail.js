// server/config/mail/membership/sendMembershipApprovalEmail.js
const transporter = require('../transporter');

const sendMembershipApprovalEmail = async (membership) => {
  try {
    const startDate = membership.memberShipStartDate
      ? new Date(membership.memberShipStartDate).toLocaleDateString()
      : "N/A";
    const endDate = membership.memberShipEndDate
      ? new Date(membership.memberShipEndDate).toLocaleDateString()
      : "Lifetime / Ongoing";

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: membership.email,
      subject: `🎉 Welcome to the ${membership.membershipType} Membership - Silver Arcade Premier`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
        <div style="background: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 3px 12px rgba(0,0,0,0.08);">
          
          <h2 style="color: #02008F; text-align: center; margin-bottom: 25px;">🎉 Congratulations, ${membership.firstName}!</h2>
          
          <p style="font-size: 15px; line-height: 1.6; color: #555;">
            We are thrilled to officially welcome you as a valued <b>${membership.membershipType}</b> Member at 
            <b>Silver Arcade Premier</b>. Your membership has been <span style="color: green;"><b>approved</b></span> and is now active.
          </p>
          
          <h3 style="color: #333; margin-top: 25px;">📅 Membership Period:</h3>
          <ul style="font-size: 15px; line-height: 1.8; color: #444; list-style-type: none; padding: 0;">
            <li><b>Start Date:</b> ${startDate}</li>
            <li><b>End Date:</b> ${endDate}</li>
          </ul>

          <h3 style="color: #333; margin-top: 25px;">✨ What You Can Expect:</h3>
          <ul style="font-size: 15px; line-height: 1.8; color: #444;">
            <li>Exclusive discounts & rewards at our facilities</li>
            <li>Priority access to events and reservations</li>
            <li>Personalized support from our team</li>
          </ul>

          <p style="margin-top: 25px; font-size: 15px; color: #555;">
            We look forward to accompanying you on a rewarding journey filled with luxury, fine dining, events, and more!
          </p>
          
          <p style="font-size: 14px; margin-top: 25px; color: #777;">
            Warm Regards,<br/>
            <b>The Membership Team</b><br/>
            Silver Arcade Premier<br/>
            📞 +7719381841 / 42 / 55 | 📧 mdshabib1993@gmail.com
          </p>
        </div>
      </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Membership approval email sent successfully to: ${membership.email}`);
  } catch (error) {
    console.error("❌ Error sending membership approval email:", error);
  }
};

module.exports = sendMembershipApprovalEmail;