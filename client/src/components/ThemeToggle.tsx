
import { Moon, Sun } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <Toggle
      pressed={isDark}
      onPressedChange={toggleTheme}
      className="flex w-full justify-start gap-2 px-3"
    >
      {isDark ? (
        <>
          <Moon className="h-4 w-4" />
          <span>Dark mode</span>
        </>
      ) : (
        <>
          <Sun className="h-4 w-4" />
          <span>Light mode</span>
        </>
      )}
    </Toggle>
  );
}
