import * as React from "react";
import { ReactTransliterate } from "react-transliterate";
import "react-transliterate/dist/index.css";
import { cn } from "@/lib/utils";
import { Languages } from "lucide-react";

interface TamilInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  name?: string;
  disabled?: boolean;
}

const TamilInput = React.forwardRef<HTMLInputElement, TamilInputProps>(
  ({ value, onChange, onBlur, placeholder, className, name, disabled }, _ref) => {
    const [transliterateEnabled, setTransliterateEnabled] = React.useState(true);

    return (
      <div className="relative">
        <ReactTransliterate
          value={value}
          onChangeText={(text) => onChange(text)}
          lang="ta"
          enabled={transliterateEnabled}
          containerClassName="tamil-transliterate-container"
          renderComponent={(props) => {
            const { onChange: libOnChange, onKeyDown, onBlur: libOnBlur, ref: libRef, ...restProps } = props;
            return (
              <input
                {...restProps}
                ref={libRef}
                name={name}
                onChange={libOnChange}
                onKeyDown={onKeyDown}
                onBlur={(e) => {
                  libOnBlur?.(e);
                  onBlur?.();
                }}
                placeholder={placeholder}
                disabled={disabled}
                className={cn(
                  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-9 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm font-tamil",
                  className
                )}
              />
            );
          }}
        />
        <button
          type="button"
          onClick={() => setTransliterateEnabled((prev) => !prev)}
          title={transliterateEnabled ? "Tamil mode ON – click to type in English" : "English mode – click for Tamil transliteration"}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded transition-colors",
            transliterateEnabled
              ? "text-primary hover:text-primary/80"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Languages className="h-4 w-4" />
        </button>
      </div>
    );
  }
);

TamilInput.displayName = "TamilInput";

export { TamilInput };
