export default function SupportPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Support</h1>
        <p className="text-gray-500 text-sm mt-1">Patient and provider support management</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
        <div className="text-5xl mb-4">💬</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Support Dashboard</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          The full ticketing and support system is coming in Phase 2. 
          Currently, support requests are handled via the operations team directly.
        </p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
          <div className="bg-gray-50 rounded-xl p-5">
            <p className="text-2xl mb-2">📧</p>
            <p className="text-sm font-medium text-gray-800">Email Support</p>
            <p className="text-xs text-gray-500 mt-1">support@curex24.com</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-5">
            <p className="text-2xl mb-2">📞</p>
            <p className="text-sm font-medium text-gray-800">Phone Support</p>
            <p className="text-xs text-gray-500 mt-1">+91 1800-XXX-XXXX</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-5">
            <p className="text-2xl mb-2">🕐</p>
            <p className="text-sm font-medium text-gray-800">Hours</p>
            <p className="text-xs text-gray-500 mt-1">24/7 availability</p>
          </div>
        </div>
      </div>
    </div>
  );
}
