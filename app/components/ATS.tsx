import React from "react";

interface ATSProps {
  score?: number;
  suggestions?: { type: "good" | "improve"; tip: string }[];
}

const Ats = ({ score, suggestions }: ATSProps) => {
  return <div>Ats</div>;
};
export default Ats;
