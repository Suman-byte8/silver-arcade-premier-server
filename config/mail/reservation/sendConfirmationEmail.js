// server/config/mail/reservation/sendConfirmationEmail.js
const transporter = require("../transporter");
const fs = require("fs");
const path = require("path");
const generateConfirmationPDF = require("../../../utilities/pdf/confirmationPDF.server");

const sendConfirmationEmail = async (booking, type) => {
  try {
    const filePath = path.join(__dirname, `../../../tmp/conf_${booking._id}.pdf`);
    await generateConfirmationPDF(booking, type, filePath);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: booking.guestInfo.email,
      subject: `✅ Your ${type} Booking is Confirmed - Silver Arcade Premier`,
      html: `
      <div style="font-family: Arial, sans-serif; background-color:#f4f6f9; padding:20px;">
        <!-- HEADER -->
        <div style="background-color:#02008F; padding:15px; text-align:center; color:white; font-size:20px; font-weight:bold;">
          Silver Arcade Premier
        </div>
        
        <!-- HERO IMAGE -->
        <img src="https://yourdomain.com/banner.png" alt="Hotel Banner" 
             style="width:100%; max-height:200px; object-fit:cover; display:block;">

        <!-- CONTENT CARD -->
        <div style="background:white; max-width:640px; margin:20px auto; padding:30px; border-radius:12px; box-shadow:0 3px 12px rgba(0,0,0,0.1);">
          <h1 style="color:green; text-align:center;">✅ Booking Confirmed</h1>
          <p style="font-size:15px; color:#555;">Dear ${booking.guestInfo.name},</p>
          <p style="font-size:15px; line-height:1.6; color:#555;">
            We’re delighted to <b>confirm</b> your <b>${type}</b> booking at <b>Silver Arcade Premier</b>. 🎉
          </p>
          <p style="font-size:15px; line-height:1.6; color:#555;">We look forward to welcoming you soon!</p>

          <h3 style="margin-top:20px; color:#02008F;">📑 Booking Details</h3>
          <ul style="font-size:14px; line-height:1.8; color:#444;">
            <li><b>Booking ID:</b> ${booking._id}</li>
            ${booking.date ? `<li><b>Date:</b> ${new Date(booking.date).toLocaleDateString()}</li>` : ""}
            ${booking.arrivalDate ? `<li><b>Check-in:</b> ${new Date(booking.arrivalDate).toLocaleDateString()}</li>` : ""}
            ${booking.departureDate ? `<li><b>Check-out:</b> ${new Date(booking.departureDate).toLocaleDateString()}</li>` : ""}
            ${booking.timeSlot ? `<li><b>Time:</b> ${booking.timeSlot}</li>` : ""}
            ${booking.numberOfGuests ? `<li><b>Guests:</b> ${booking.numberOfGuests}</li>` : ""}
            ${booking.numberOfRooms ? `<li><b>Rooms:</b> ${booking.numberOfRooms}</li>` : ""}
          </ul>

          <p style="font-size:14px; margin-top:20px; color:#777;">
            Please find your confirmation receipt attached as PDF.
          </p>
          <p style="font-size:14px; margin-top:20px; color:#555;">
            Warm regards,<br/>
            <b>Team Silver Arcade Premier</b>
          </p>
        </div>

        <!-- FOOTER -->
        <div style="text-align:center; font-size:12px; color:white; background-color:#02008F; padding:15px; margin-top:20px;">
          📞 +7719381841 | 📧 mdshabib1993@gmail.com <br/>
          Charchpally, ITI More, Malda, West Bengal – 732101
        </div>
      </div>`,
      // attachments: [{ filename: "Booking_Confirmation.pdf", path: filePath, contentType: "application/pdf" }],
    };

    await transporter.sendMail(mailOptions);
    fs.unlinkSync(filePath);
    console.log("✅ Confirmation email sent with PDF");
  } catch (err) {
    console.error("❌ Error in Confirmation mail:", err);
  }
};

module.exports = sendConfirmationEmail;