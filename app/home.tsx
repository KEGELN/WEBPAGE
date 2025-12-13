// app/page.tsx
export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Hero Section */}
      <header className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 text-gray-900">
          Welcome to Our Platform
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          Modern solution for your business needs. Get started today with our
          powerful features.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md transition-colors">
            Get Started
          </button>
          <button className="border border-gray-300 hover:bg-gray-100 text-gray-700 font-medium py-2 px-6 rounded-md transition-colors">
            Learn More
          </button>
        </div>
      </header>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map((item) => (
            <div 
              key={item}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <h3 className="text-xl font-semibold mb-2">Feature {item}</h3>
              <p className="text-gray-600">
                Brief description of feature {item} and its benefits for users.
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-gray-300 max-w-lg mx-auto mb-8">
            Join thousands of satisfied users and start your journey today.
          </p>
          <button className="bg-white text-gray-900 hover:bg-gray-100 font-medium py-3 px-8 rounded-md transition-colors">
            Sign Up Free
          </button>
        </div>
      </section>
    </div>
  );
}