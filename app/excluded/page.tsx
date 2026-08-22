export default function ExcludedPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-black flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-md border border-gray-100 text-center">
        <h1 className="text-xl font-bold mb-4">Du bist leider nicht in der Lage, an der Studie teilzunehmen.</h1>
        <p className="text-gray-600 leading-relaxed">
          Trotzdem vielen Dank für deine Bereitschaft. Du kannst das Fenster jetzt schließen.
        </p>
      </div>
    </div>
  );
}
