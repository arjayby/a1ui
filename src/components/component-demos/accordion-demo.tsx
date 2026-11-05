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
    value: "about",
    question: "What is a1ui?",
    answer: [
      "A collection of animated React components and blocks.",
      "Each one has a live preview, documentation, and an entry in the shadcn registry.",
    ],
  },
  {
    value: "install",
    question: "How do I add a component?",
    answer: [
      "Pass its registry URL to the shadcn CLI, and the source is copied into your project.",
      "Or use Copy prompt for agent, and your coding agent installs and integrates it for you.",
      "Components need React 19, TypeScript, and Tailwind CSS 4.",
    ],
  },
  {
    value: "editing",
    question: "Can I change the code?",
    answer: [
      "Yes. The source lives in your project, so you can edit its markup, styles, and motion freely. a1ui is MIT licensed.",
    ],
  },
];

export function AccordionPreview() {
  return (
    <Accordion className="w-full max-w-64">
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
          icon={icon}
          multiple={mode === "multiple"}
          duration={duration}
          className="w-full max-w-md px-4"
        >
          {questions.map((item) => (
            <AccordionItem key={item.value} value={item.value}>
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
