import { SearchBar } from "./SearchBar";

export function SearchBarHeader() {
  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b">
      <div className="h-11 flex items-center px-4">
        <SearchBar />
      </div>
    </div>
  );
}
