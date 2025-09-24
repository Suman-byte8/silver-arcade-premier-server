// server/config/mail/reservation/sendAcknowledgementEmail.js
const transporter = require("../transporter");
const fs = require("fs");
const path = require("path");
const generateAcknowledgementPDF = require("../../../utilities/pdf/acknowledgementPDF.server");

const sendAcknowledgementEmail = async (booking, type) => {
  try {
    const filePath = path.join(__dirname, `../../../tmp/ack_${booking._id}.pdf`);
    await generateAcknowledgementPDF(booking, type, filePath);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: booking.guestInfo.email,
      subject: `📩 We Received Your ${type} Booking Request`,
      html: `
      <div style="font-family: Arial, sans-serif; background-color:#f4f6f9; padding:20px;">
        <!-- HEADER -->
        <div style="background-color:#02008F; padding:15px; text-align:center; color:white; font-size:20px; font-weight:bold;">
          Silver Arcade Premier
        </div>
        
        <!-- HERO IMAGE -->
        <img src="https://i.pinimg.com/736x/6f/79/8d/6f798d99ef4b1e488532d63969d7a51f.jpg" alt="Hotel Banner" 
             style="width:100%; max-height:200px; object-fit:cover; display:block;">

        <!-- CONTENT CARD -->
        <div style="background:white; max-width:640px; margin:20px auto; padding:30px; border-radius:12px; box-shadow:0 3px 12px rgba(0,0,0,0.1);">
          <h1 style="color:#02008F; text-align:center;">📩 Booking Acknowledgement</h1>
          <p style="font-size:15px; color:#555;">Dear ${booking.guestInfo.name},</p>
          <p style="font-size:15px; line-height:1.6; color:#555;">
            Thank you for choosing <b>Silver Arcade Premier</b>. We have <b>received</b> your <b>${type}</b> booking request. 🎉
          </p>
          <p style="font-size:15px; line-height:1.6; color:#555;">
            Our team will review your request shortly. One of our staff may call or email you if needed. 
            A final <b>confirmation email</b> will be sent once your booking is approved.
          </p>

          <h3 style="margin-top:20px; color:#02008F;">📑 Booking Summary</h3>
          <ul style="font-size:14px; line-height:1.8; color:#444;">
            <li><b>Booking ID:</b> ${booking._id}</li>
            ${booking.date ? `<li><b>Date:</b> ${new Date(booking.date).toLocaleDateString()}</li>` : ""}
            ${booking.arrivalDate ? `<li><b>Arrival:</b> ${new Date(booking.arrivalDate).toLocaleDateString()}</li>` : ""}
            ${booking.departureDate ? `<li><b>Departure:</b> ${new Date(booking.departureDate).toLocaleDateString()}</li>` : ""}
            ${booking.timeSlot ? `<li><b>Time:</b> ${booking.timeSlot}</li>` : ""}
          </ul>

          <p style="font-size:14px; color:#777; margin-top:20px;">
            Please find your acknowledgement receipt attached as PDF.
          </p>
          <p style="font-size:14px; color:#555; margin-top:20px;">
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
      // attachments: [{ filename: "Booking_Acknowledgement.pdf", path: filePath, contentType: "application/pdf" }],
    };

    await transporter.sendMail(mailOptions);
    fs.unlinkSync(filePath);
    console.log("📩 Acknowledgement email sent with PDF");
  } catch (err) {
    console.error("❌ Error in Acknowledgement mail:", err);
  }
};

module.exports = sendAcknowledgementEmail;