export function Divider({ label = "or" }: { label?: string }) {
  return (
    <div className="relative my-1">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-200 dark:border-gray-700" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-white px-3 font-medium tracking-wider text-gray-400 dark:bg-gray-950 dark:text-gray-500">
          {label}
        </span>
      </div>
    </div>
  );
}
