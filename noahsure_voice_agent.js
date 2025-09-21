/*
 * Noahsure Group AI Voice Agent
 *
 * This Node.js server implements a simple Twilio webhook for handling
 * inbound and outbound calls and adds a lightweight administration
 * dashboard, SMS follow‑ups, and basic transcript redaction. It is
 * designed as a starting point to be integrated with OpenAI’s realtime
 * API and other internal systems (Calendly/CRM/email) via the stub
 * functions defined below.
 *
 * To run this server you need to set the following environment variables:
 *
 *   TWILIO_ACCOUNT_SID – your Twilio account SID
 *   TWILIO_AUTH_TOKEN  – your Twilio auth token
 *   TWILIO_PHONE_NUMBER – your Twilio number for calls/SMS
 *   PORT – (optional) port to listen on; defaults to 3000
 *
 * Install dependencies:
 *   npm install express body-parser twilio
 *
 * Then start the server:
 *   node noahsure_voice_agent.js
 *
 * This code is intentionally minimalist; you should replace the stub
 * functions with real integrations (Calendly, SendGrid/SES, CRM,
 * Twilio <Dial>/media streams, etc.) for production use.
 */

const express = require('express');
const bodyParser = require('body-parser');
const Twilio = require('twilio');
const { twiml: { VoiceResponse } } = require('twilio');

// Read credentials from environment
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
if (!accountSid || !authToken || !twilioNumber) {
  console.warn('TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER must be set');
}

// Initialize Twilio REST client
const client = Twilio(accountSid, authToken);

// In‑memory stores for call state and transcripts. In production you
// should persist these in a database or CRM.
const calls = [];
const transcripts = [];

// Create Express app
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

/**
 * Inbound voice webhook.
 *
 * Twilio will HTTP POST to this endpoint when someone calls your number.
 * You can use the VoiceResponse to greet the caller, collect digits
 * (IVR) or start a <Stream> to your AI brain. This implementation
 * simply announces the call and could be extended to branch on DTMF
 * input or forward to a live agent.
 */
app.post('/voice/inbound', (req, res) => {
  const callSid = req.body.CallSid;
  const from = req.body.From;

  // Track the call start
  calls.push({ callSid, from, timestamp: new Date().toISOString(), disposition: 'InProgress' });

  const response = new VoiceResponse();
  // Legally announce call recording/consent in the UK
  response.say({ voice: 'alice', language: 'en-GB' }, 'Hello, this is Noahsure Group. This call may be recorded for training and compliance.');

  // TODO: Implement IVR menu or AI media stream here. For now we just
  // prompt the caller to leave a message and hang up.
  response.say({ voice: 'alice', language: 'en-GB' }, 'Please leave a brief message after the tone and one of our team will call you back shortly.');
  response.record({ maxLength: 120, action: '/voice/recording_complete' });
  response.hangup();

  res.type('text/xml');
  res.send(response.toString());
});

/**
 * Called by Twilio when a recording is complete. We use this to
 * simulate transcript redaction and an SMS follow‑up. In a real
 * deployment you would feed the recording to your AI model for a
 * summary, log the call in your CRM and send relevant material via
 * email/SMS.
 */
app.post('/voice/recording_complete', async (req, res) => {
  const callSid = req.body.CallSid;
  const from = req.body.From;
  const recordingUrl = req.body.RecordingUrl;

  // Mark call as completed
  const call = calls.find(c => c.callSid === callSid);
  if (call) {
    call.disposition = 'Completed';
  }

  // Simulate transcript fetch & redaction. In practice you’d fetch
  // the recording, transcribe it via an STT service, then redact.
  const fakeTranscript = `Call from ${from}, recording URL: ${recordingUrl}`;
  const redacted = redact(fakeTranscript);
  transcripts.push({ callSid, from, transcript: redacted, timestamp: new Date().toISOString() });

  // Send follow‑up SMS with a scheduled meeting link
  try {
    const meetingLink = scheduleMeeting({ name: 'Caller', phone: from, email: '', dept: 'Investors' });
    await client.messages.create({
      body: `Thank you for contacting Noahsure Group. We have scheduled a call to discuss your needs: ${meetingLink}`,
      from: twilioNumber,
      to: from,
    });
  } catch (err) {
    console.error('Failed to send follow‑up SMS:', err.message);
  }

  res.sendStatus(204);
});

/**
 * Example stub for scheduling a meeting with a calendar service. Replace
 * this with an API call to Calendly, Google Calendar, HubSpot etc.
 */
function scheduleMeeting({ name, phone, email, dept }) {
  // Example meeting link; real implementation would create a meeting and return the URL
  const slug = dept.toLowerCase();
  return `https://calendly.com/noahsure/${slug}-consultation`;
}

/**
 * Stub for sending information packs via email. Replace with an email
 * provider integration (e.g. SendGrid, AWS SES) in production.
 */
async function sendInfoPack(email, topic) {
  console.log(`Sending info pack about ${topic} to ${email}`);
  // TODO: implement actual email sending
}

/**
 * Stub for logging a lead and call details into your CRM or database.
 */
async function logCRM({ name, phone, email, notes, disposition }) {
  console.log(`Logging call ${phone} with disposition ${disposition}`);
  // TODO: write to CRM or database
}

/**
 * Stub for warm transferring a call to a human agent. In a real call
 * flow you would return TwiML instructing Twilio to <Dial> the
 * specified number.
 */
function warmTransfer(to) {
  const response = new VoiceResponse();
  const dial = response.dial();
  dial.number(to);
  return response.toString();
}

/**
 * Very simple redaction that replaces phone numbers and email
 * addresses with [REDACTED]. For real PII filtering use a library
 * or ML model tuned for UK data.
 */
function redact(text) {
  return text
    // redact UK/US phone numbers
    .replace(/\+?\d{1,2}[\s.-]?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}/g, '[REDACTED]')
    // redact generic emails
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED]');
}

/**
 * Admin dashboard endpoint. Returns JSON listing current call logs
 * and transcripts. In a production system you’d want authentication
 * here to protect customer data.
 */
app.get('/admin', (req, res) => {
  res.json({ calls, transcripts });
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Noahsure Voice Agent server running on port ${port}`);
});