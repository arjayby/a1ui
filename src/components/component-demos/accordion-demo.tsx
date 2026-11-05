"use client";

import { useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  type AccordionProps,
} from "@/registry/components/accordion";

type Icon = NonNullable<AccordionProps["icon"]>;
type Mode = "single" | "multiple";
const icons: Icon[] = ["chevron", "plus"];
const modes: Mode[] = ["single", "multiple"];

const questions = [
  {
    value: "shipping",
    question: "How long does shipping take?",
    answer: [
      "Orders leave our warehouse within one business day.",
      "Standard delivery takes two to four days. Express arrives the next day in most cities.",
    ],
  },
  {
    value: "returns",
    question: "Can I return an item?",
    answer: [
      "Send anything back within 30 days for a full refund.",
      "Print a prepaid label from your order page and drop the parcel at any carrier point.",
      "Refunds reach your card three to five days after we receive it.",
    ],
  },
  {
    value: "warranty",
    question: "Is there a warranty?",
    answer: ["Every product carries a two-year warranty against manufacturing defects."],
  },
  {
    value: "wholesale",
    question: "Do you offer wholesale pricing?",
    answer: ["Wholesale accounts open again next quarter."],
    disabled: true,
  },
];

export function AccordionPreview() {
  return (
    <Accordion defaultValue={["shipping"]} className="w-full max-w-64">
      {questions.slice(0, 2).map((item) => (
        <AccordionItem key={item.value} value={item.value}>
          <AccordionTrigger>{item.question}</AccordionTrigger>
          <AccordionContent>
            <div>{item.answer[0]}</div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export function AccordionDemo() {
  const [icon, setIcon] = useState<Icon>("chevron");
  const [mode, setMode] = useState<Mode>("single");
  const [duration, setDuration] = useState(0.3);

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <Accordion
          key={`${icon}-${mode}-${duration}`}
          defaultValue={["shipping"]}
          icon={icon}
          multiple={mode === "multiple"}
          duration={duration}
          className="w-full max-w-md px-4"
        >
          {questions.map((item) => (
            <AccordionItem key={item.value} value={item.value} disabled={item.disabled}>
              <AccordionTrigger>{item.question}</AccordionTrigger>
              <AccordionContent className="grid gap-2">
                {item.answer.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
      <div className="component-demo-controls">
        <DemoSelect label="Icon" value={icon} options={icons} onChange={setIcon} />
        <DemoSelect label="Mode" value={mode} options={modes} onChange={setMode} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
