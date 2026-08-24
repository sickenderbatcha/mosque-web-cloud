import { useEffect, useState } from "react";
import {
  getCertificateFooter,
  type CertificateFooterText,
  type CertificateFooterType,
} from "@/lib/certificateFooterSettings";

interface Props {
  type: CertificateFooterType;
}

/** Configurable certificate footer (Superadmin Dashboard → Settings). */
export default function CertificateFooterBlock({ type }: Props) {
  const [footer, setFooter] = useState<CertificateFooterText>({ ta: "", en: "" });

  useEffect(() => {
    getCertificateFooter(type).then(setFooter);
  }, [type]);

  const ta = (footer.ta || "").trim();
  const en = (footer.en || "").trim();
  if (!ta && !en) return null;

  return (
    <div className="text-center mt-6 text-[10px] leading-snug">
      {ta && <p className="font-tamil">{ta}</p>}
      {en && <p>{en}</p>}
    </div>
  );
}
