const nodemailer = require('nodemailer');
const path = require('path');
const ejs = require('ejs');

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,   
    pass: process.env.SMTP_PASS,    
  },
});

exports.sendMail = async(to, subject, templateName, data = {}) =>{
    try {
        const templatePath = path.join(__dirname, `../template/${templateName}.ejs`);

        const html = await ejs.renderFile(templatePath, data);

        const mailOptions = {
            from: `"TicketMate" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${to} using ${templateName}.ejs`);
    } catch (error) {
        console.error("❌ Error sending email:", error);
        throw error;
    }
}