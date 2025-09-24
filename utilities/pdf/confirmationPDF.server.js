const { jsPDF } = require("jspdf");
const fs = require("fs");
const path = require("path");

/**
 * Generate Confirmation PDF styled like Haven Hotels example
 */
async function generateConfirmationPDF(bookingData, bookingType, outputPath) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = 210;
  const pageHeight = 297;
  let y = 15;

  // ▬▬▬▬ LOGO AND HEADER ▬▬▬▬
  try {
    const logoPath = path.join(__dirname, "../../../Client/public/logo.png");
    if (fs.existsSync(logoPath)) {
      const logoImage = fs.readFileSync(logoPath);
      doc.addImage(logoImage, "PNG", 15, y, 60, 30); // Adjust size as needed
    }
  } catch (e) {
    console.warn("Logo image missing");
  }

  y += 40;

  // Greeting
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(`Hey, ${bookingData?.guestInfo?.name || "Guest"}`, 15, y);
  y += 15;

  // Confirmation Title
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Your reservation is", 15, y);
  y += 20;
  doc.text("confirmed!", 15, y);
  y += 25;

  // Add horizontal line
  doc.setDrawColor(200, 200, 200);
  doc.line(15, y, pageWidth - 15, y);
  y += 10;

  // Confirmation Number
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("Confirmation Number:", 15, y);
  doc.setTextColor(214, 148, 30); // Orange color
  doc.text((bookingData._id || "VJ0069").toString(), 15 + 150, y); // Offset for number
  y += 20;

  // ▬▬▬▬ ROOM IMAGE ▬▬▬▬
  try {
    const roomImagePath = path.join(__dirname, "../../../Client/public/room.jpg");
    if (fs.existsSync(roomImagePath)) {
      const roomImage = fs.readFileSync(roomImagePath);
      doc.addImage(roomImage, "JPEG", 15, y, 180, 120);
    } else {
      doc.setFillColor(240, 240, 240);
      doc.rect(15, y, 180, 120, "F");
      doc.setTextColor(100);
      doc.setFontSize(10);
      doc.text("Room Image", 15 + 90, y + 60, { align: "center" });
    }
  } catch (e) {
    doc.setFillColor(240, 240, 240);
    doc.rect(15, y, 180, 120, "F");
    doc.setTextColor(100);
    doc.setFontSize(10);
    doc.text("Room Image", 15 + 90, y + 60, { align: "center" });
  }
  y += 130;

  // ▬▬▬▬ CHECK-IN / CHECK-OUT ▬▬▬▬
  doc.setFontSize(12);
  doc.setTextColor(0);

  // Left Column: Check-In
  doc.text("Sunday,", 15, y);
  doc.text("July 07, 2024", 15, y + 10);
  doc.text("Check-In", 15, y + 20);

  // Right Column: Check-Out
  doc.text("Tuesday,", 100, y);
  doc.text("July 09, 2024", 100, y + 10);
  doc.text("Check-Out", 100, y + 20);

  y += 40;

  // Horizontal Line
  doc.setDrawColor(200, 200, 200);
  doc.line(15, y, pageWidth - 15, y);
  y += 15;

  // ▬▬▬▬ GUEST & ROOM INFO ▬▬▬▬
  const leftColX = 15;
  const rightColX = 100;

  doc.setFontSize(12);
  doc.setTextColor(0);

  // Name
  doc.text("Name", leftColX, y);
  doc.text(bookingData?.guestInfo?.name || "John Smith", rightColX, y);
  y += 15;

  // Room Type
  doc.text("Room Type", leftColX, y);
  doc.text(
    bookingData.roomType || "1 Double Standard",
    rightColX,
    y
  );
  y += 15;

  // Guests
  doc.text("Number of Guests", leftColX, y);
  doc.text(
    `${bookingData.totalAdults || 1} Adult${bookingData.totalAdults !== 1 ? 's' : ''}, ${
      bookingData.totalChildren || 1
    } Child${bookingData.totalChildren !== 1 ? 's' : ''}`,
    rightColX,
    y
  );
  y += 30;

  // Amount
  doc.text("Amount", leftColX, y);
  doc.text(`₹${bookingData.amount || 3500}`, rightColX, y);
  y += 30;

  // Horizontal Line
  doc.setDrawColor(200, 200, 200);
  doc.line(15, y, pageWidth - 15, y);
  y += 15;

  // ▬▬▬▬ SPECIAL REQUESTS ▬▬▬▬
  doc.text("Special Requests", leftColX, y);
  y += 10;

  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(
    "If you have any special requests or need further assistance, please call 887-658-1234.",
    rightColX,
    y
  );
  y += 15;

  // Horizontal Line
  doc.setDrawColor(200, 200, 200);
  doc.line(15, y, pageWidth - 15, y);
  y += 15;

  // ▬▬▬▬ HOTEL ADDRESS ▬▬▬▬
  doc.text("Hotel Address", leftColX, y);
  y += 10;

  const hotelAddress = [
    "Gravity Hotel,",
    "1220 Ocean View Drive,",
    "Seaside Cover, California (CA),",
    "United States."
  ];

  hotelAddress.forEach((line, i) => {
    doc.text(line, rightColX, y + i * 10);
  });

  y += 50;

  // ▬▬▬▬ FOOTER ▬▬▬▬
  doc.setDrawColor(200, 200, 200);
  doc.line(15, y, pageWidth - 15, y);
  y += 15;

  // Bottom Logo
  try {
    const footerLogoPath = path.join(__dirname, "../../../Client/public/logo-footer.png");
    if (fs.existsSync(footerLogoPath)) {
      const footerLogo = fs.readFileSync(footerLogoPath);
      doc.addImage(footerLogo, "PNG", 15, y, 60, 30);
    }
  } catch (e) {
    doc.setFontSize(12);
    doc.text("HAVEN HOTELS", 15, y + 20);
  }

  // Footer text
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text("1220 Ocean View Drive, Seaside", 15, y + 40);
  doc.text("Cover, California (CA), US.", 15, y + 50);

  // Social Icons (as text placeholders)
  doc.text("f", 150, y + 30);
  doc.text("X", 165, y + 30);
  doc.text("P", 180, y + 30);

  // Copyright
  doc.text("© 2024 Haven Hotel", 150, y + 45);
  doc.text("If you don't want to hear from us, click here.", 150, y + 55);

  // Save PDF
  const dateStamp = new Date().toISOString().slice(0, 10);
  const buffer = Buffer.from(doc.output("arraybuffer"));
  fs.writeFileSync(outputPath, buffer);
}

module.exports = generateConfirmationPDF;