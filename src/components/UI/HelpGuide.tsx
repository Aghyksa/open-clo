import { useState } from 'react';
import { Layers, Palette, Ruler, Box, Save, ArrowRight } from 'lucide-react';
import { Dialog } from './Dialog';

const steps = [
  { title: 'Start in your workspace', icon: Layers, body: 'Choose a garment template, or use Import pattern for your SVG or CorelDRAW 2020 outlines. Check the scale and select panels for one size before importing. Give your design a name, then open the editor. Every design belongs to your account. The original template stays available for everyone.' },
  { title: 'Make it yours in Design', icon: Palette, body: 'Choose fabric and colors in Details. Use Artwork to add a preset, text or your image. Click artwork to select it, drag to move it, drag a corner to resize, or use the round handle to rotate. Switch Front and Back to edit each side.' },
  { title: 'Adjust size in Pattern', icon: Ruler, body: 'Open Pattern and choose a panel. Details shows its width and length in centimeters. Keep linked front and back panels enabled when sizing a garment. Use Select to move panels, Points to change the outline and Curve to bend an edge. Imported panels also have names, 3D roles, quantities, grainlines and notches in Details. Use Sewing to connect matching panel edges; imported files start unsewn. Shape changes update 3D.' },
  { title: 'Check the shape in 3D', icon: Box, body: 'Drag to orbit the garment. Scroll or pinch to zoom. Front, Back and ¾ give useful camera angles. A preview takes a moment to settle after pattern or body changes. Use Save image to download a view. Validate a physical sample before production.' },
  { title: 'Save and come back', icon: Save, body: 'Edits save automatically to your account. Wait for Saved before leaving. If saving fails, retry or download Project JSON from Export to keep a backup. Export SVG includes full-size outlines and cutting notes. Print at 100% and measure its 100 mm check square; curved or concave seam allowances are recorded without an automatic offset. My workspace contains your designs on any device. Import backup restores a downloaded project as a new design.' },
];
export function HelpGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const item = steps[step], Icon = item.icon;
  return <Dialog open={open} onClose={onClose} title="Your first design, in five steps">
    <div className="flex gap-2 mb-6">{steps.map((value, index) => <button key={value.title} onClick={() => setStep(index)} aria-label={`Step ${index + 1}: ${value.title}`} aria-current={step === index ? 'step' : undefined} className={`flex-1 h-2 rounded-full ${step === index ? 'bg-teal-800' : 'bg-stone-300'}`} />)}</div>
    <Icon size={32} className="text-teal-800 mb-4" /><p className="text-xs text-stone-500 mb-2">STEP {step + 1} OF {steps.length}</p>
    <h3 className="text-xl font-semibold mb-3">{item.title}</h3><p className="text-stone-600 text-sm leading-relaxed min-h-28">{item.body}</p>
    <div className="mt-6 pt-4 border-t border-stone-200 flex justify-between items-center gap-4"><button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="text-sm px-3 py-2 disabled:opacity-30">Previous</button><button onClick={() => step === steps.length - 1 ? onClose() : setStep(step + 1)} className="flex gap-2 items-center text-sm bg-teal-800 text-white rounded-lg px-4 py-2.5">{step === steps.length - 1 ? 'Ready to design' : 'Next step'}<ArrowRight size={16} /></button></div>
    <p className="text-xs text-stone-500 mt-5">Help stays available in your workspace and editor. Undo works with Ctrl / ⌘ Z. On touch screens, use two fingers to pan or pinch to zoom.</p>
  </Dialog>;
}
