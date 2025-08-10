import React, { useState } from "react";
import emailjs from "@emailjs/browser";

const SimplePaywall = () => {
  const [step, setStep] = useState("initial");
  const [selectedReason, setSelectedReason] = useState("");
  const [emailStatus, setEmailStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendFeedback = async (wouldPay, reason) => {
    setIsLoading(true);
    setEmailStatus("Sending...");

    try {
      // Import emailjs at the top of your file: import emailjs from '@emailjs/browser';
      const emailData = {
        would_pay: wouldPay ? "Yes" : "No",
        reason: reason,
        timestamp: new Date().toISOString(),
      };

      console.log("Sending email with data:", emailData);

      // Actual EmailJS call - uncomment this in your real app
      const result = await emailjs.send(
        "service_tr084pp",
        "template_hfrh45g",
        emailData,
        "TH8EuEmmQ8rpFc5Wv"
      );

      console.log("EmailJS success:", result);
      setEmailStatus("✅ Email sent successfully!");
      return true;
    } catch (error) {
      console.error("Email send error:", error);
      setEmailStatus(`❌ Error: ${error.message || "Failed to send email"}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleYes = () => {
    setStep("yes-why");
    setEmailStatus("");
  };

  const handleNo = () => {
    setStep("no-why");
    setEmailStatus("");
  };

  const handleYesSubmit = async () => {
    const success = await sendFeedback(true, selectedReason);
    if (success) {
      console.log("Would pay - reason:", selectedReason);
      window.location.href = "https://buy.stripe.com/dRm9AT0xB7kRfCs792efC03";
    }
  };

  const handleNoSubmit = async () => {
    const success = await sendFeedback(false, selectedReason);
    if (success) {
      console.log("Wouldn't pay - reason:", selectedReason);
      setStep("thanks");
    }
  };

  const yesReasons = [
    "It's a good concept with potential.",
    "I dislike other workout tracking apps but this is easy.",
    "Worth it to see if I'm actually getting stronger.",
    "Cheaper than a personal trainer session.",
    "I want to support small developers.",
  ];

  const noReasons = [
    "I only use free apps.",
    "Missing some features I need.",
    "Already using something else.",
    "It has too many problems and bugs.",
    "Price is too high for what it does.",
  ];

  if (step === "initial") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto p-6">
          <div className="bg-white rounded-2xl p-8 text-center space-y-6 border border-gray-200">
            <div className="text-4xl mb-4">👋</div>
            <h2 className="text-xl font-semibold text-gray-900">
              Quick question!
            </h2>
            <p className="text-gray-600">
              Would you pay <span className="font-medium">$10 once</span> for the beta version to
              support us?
            </p>

            <div className="space-y-3">
              <button
                onClick={handleYes}
                className="w-full bg-white border border-gray-300 text-gray-600 py-3 px-4 rounded-xl font-medium hover:bg-gray-100 transition-colors"
              >
                Yeah, I'd pay $10.
              </button>

              <button
                onClick={handleNo}
                className="w-full bg-white border border-gray-300 text-gray-600 py-3 px-4 rounded-xl font-medium hover:bg-gray-100 transition-colors"
              >
                Nah, not for me.
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "yes-why") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto p-6">
          <div className="bg-white rounded-2xl p-8 space-y-6 border border-gray-200">
            <div className="text-center">
              <div className="text-4xl mb-4">🎉</div>
              <h2 className="text-xl font-semibold text-gray-900">Awesome!</h2>
              <p className="text-gray-600 text-sm">What convinced you?</p>
            </div>

            <div className="space-y-2">
              {yesReasons.map((reason, index) => (
                <label
                  key={index}
                  className={`flex items-start space-x-3 p-3 rounded-xl cursor-pointer transition-colors ${
                    selectedReason === reason
                      ? "bg-blue-50 border border-blue-200"
                      : "hover:bg-gray-50 border border-transparent"
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="mt-1 text-blue-600"
                  />
                  <span className="text-gray-700 text-sm">{reason}</span>
                </label>
              ))}
            </div>

            {emailStatus && (
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-center">
                {emailStatus}
              </div>
            )}

            <button
              onClick={handleYesSubmit}
              disabled={!selectedReason || isLoading}
              className={`w-full py-3 px-4 rounded-xl font-medium transition-colors ${
                selectedReason && !isLoading
                  ? "bg-white border border-gray-300 text-gray-600 hover:bg-gray-100"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {isLoading ? "Sending..." : "Continue to payment"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "no-why") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto p-6">
          <div className="bg-white rounded-2xl p-8 space-y-6 border border-gray-200">
            <div className="text-center">
              <div className="text-4xl mb-4">🤔</div>
              <h2 className="text-xl font-semibold text-gray-900">
                No worries!
              </h2>
              <p className="text-gray-600 text-sm">What's holding you back?</p>
            </div>

            <div className="space-y-2">
              {noReasons.map((reason, index) => (
                <label
                  key={index}
                  className={`flex items-start space-x-3 p-3 rounded-xl cursor-pointer transition-colors ${
                    selectedReason === reason
                      ? "bg-blue-50 border border-blue-200"
                      : "hover:bg-gray-50 border border-transparent"
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="mt-1 text-blue-600"
                  />
                  <span className="text-gray-700 text-sm">{reason}</span>
                </label>
              ))}
            </div>

            {emailStatus && (
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-center">
                {emailStatus}
              </div>
            )}

            <button
              onClick={handleNoSubmit}
              disabled={!selectedReason || isLoading}
              className={`w-full py-3 px-4 rounded-xl font-medium transition-colors ${
                selectedReason && !isLoading
                  ? "bg-white border border-gray-300 text-gray-600 hover:bg-gray-100"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {isLoading ? "Sending..." : "Submit"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "thanks") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto p-6">
          <div className="bg-white rounded-2xl p-8 text-center space-y-6 border border-gray-200">
            <div className="text-4xl mb-4">❤️</div>
            <h2 className="text-xl font-semibold text-gray-900">Thanks!</h2>
            <p className="text-gray-600">
              Your feedback helps me build something people actually want.
            </p>

            {emailStatus && (
              <div className="p-3 bg-green-50 rounded-lg text-sm">
                {emailStatus}
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-white border border-gray-300 text-gray-600 py-3 px-4 rounded-xl font-medium hover:bg-gray-100 transition-colors"
            >
              Exit
            </button>
          </div>
        </div>
      </div>
    );
  }
};

export default SimplePaywall;
