export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-black flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-md border border-gray-100 text-center">
        <h1 className="text-2xl font-bold mb-4">Vielen Dank für deine Teilnahme!</h1>
        <p className="text-gray-600 leading-relaxed mb-4">
          Ein Teil der Rezepte, die du gerade bewertet hast, enthielt absichtlich einen von einer KI eingebauten
          Fehler — zum Beispiel eine falsche Mengenangabe, eine fehlende Zutat oder einen erfundenen Schritt. Ziel
          dieser Studie ist es, zu untersuchen, wie gut Menschen solche Fehler in KI-generierten Inhalten erkennen.
        </p>
        <p className="text-gray-500 text-sm">
          Deine Daten wurden anonymisiert gespeichert. Du kannst dieses Fenster jetzt schließen.
        </p>
      </div>
    </div>
  );
}
