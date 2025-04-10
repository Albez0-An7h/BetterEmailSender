import nodemailer from 'nodemailer';

// Configure email transporter with better error handling
const createTransporter = () => {
  console.log('Creating transporter with:', {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    // Logging user without password for security
    user: process.env.SMTP_USER,
  });
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    // Add timeout to prevent hanging connections
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
  });
};

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Received email request');
    const { to, toName, from, fromName, subject, content } = req.body;

    if (!to || !from || !content) {
      console.log('Missing fields:', { to, from, content: !!content });
      return res.status(400).json({ message: 'Missing required email fields' });
    }

    let transporter;
    try {
      transporter = createTransporter();
      // Test connection before sending
      await transporter.verify();
      console.log('Transporter verified successfully');
    } catch (verifyError) {
      console.error('Transporter verification failed:', verifyError);
      return res.status(500).json({ 
        message: 'Failed to connect to email service', 
        error: verifyError.message 
      });
    }

    // Send email
    const mailOptions = {
      from: `"${fromName}" <${from}>`,
      to: `"${toName || ''}" <${to}>`,
      subject: subject || 'No Subject',
      html: content.replace(/\n/g, '<br>'), // Convert newlines to HTML line breaks
    };

    console.log('Sending email to:', to);
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);

    res.status(200).json({ 
      message: 'Email sent successfully', 
      messageId: info.messageId 
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      message: 'Failed to send email', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
