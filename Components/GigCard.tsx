interface GigCardProps {
  title: string;
  provider: string;
  price: number;
  rating: string;
}

export default function GigCard({ title, provider, price, rating }: GigCardProps) {
  return (
    <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <h3 className="font-bold text-lg text-gray-900">{title}</h3>
      <p className="text-gray-500 text-sm mb-4">{provider}</p>
      
      <div className="flex justify-between items-center border-t pt-4">
        {}
        <span className="text-amber-900 font-bold">₹{price}<span className="text-sm font-normal text-gray-500">/hr</span></span>
        <span className="text-yellow-500 font-semibold text-sm">⭐ {rating}</span>
      </div>
    </div>
  );
}