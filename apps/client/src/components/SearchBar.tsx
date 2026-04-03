import { Search } from "lucide-react";

const SearchBar = () => {
  return (
    <div className="hidden min-w-0 sm:flex items-center gap-2 rounded-md ring-1 ring-gray-200 px-2 py-1 shadow-md md:min-w-56">
      <Search className="w-4 h-4 text-gray-500" />
      <input
        id="search"
        placeholder="Search..."
        className="min-w-0 flex-1 text-sm outline-0"
      />
    </div>
  );
};

export default SearchBar;
