import Card from "../components/ui/Card";
import Thread from "../components/ui/Thread";
import LinkButton from "../components/ui/LinkButton";

const steps = [
  { title: "Send the bot", body: "Paste a meeting link. The bot joins, introduces itself, and records." },
  { title: "Read both languages", body: "Deepgram transcribes Hindi and English in one stream, with speakers named." },
  { title: "Get the essence", body: "Minutes, insights, and strategy arrive the moment the call ends." },
];

export function Home() {
  return (
    <div className="mx-auto max-w-canvas px-4 sm:px-8">
      <section className="grid items-center gap-10 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24">
        <div>
          <h1 className="text-display">
            Every meeting,{" "}
            <br />
            reduced to its{" "}
            <span lang="hi" className="text-thread" style={{ fontStretch: "100%", fontWeight: 600 }}>
              सार
            </span>
          </h1>
          <p className="mt-5 max-w-prose text-[17px] font-light leading-relaxed text-ink-2">
            SaarAI sends a bot into your Google Meet, Zoom, or Teams call, transcribes Hindi and English together, and hands back the decisions, owners, and next steps.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <LinkButton to="/signup">Create account</LinkButton>
            <LinkButton to="/login" variant="secondary">Sign in</LinkButton>
            <span className="ml-1 text-small text-ink-2">Free while in preview</span>
          </div>
        </div>

        <Card noPadding className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-body">Q3 vendor review</span>
            <span className="text-small text-ink-2">started 14:02</span>
          </div>
          <Thread state="ready" size="large" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <h2 className="mb-2 text-small text-ink-2">Transcript</h2>
              <p className="text-small font-normal leading-relaxed text-ink-2">
                <span className="text-cyan">Ravi</span> हाँ तो Q3 के लिए हम vendor change कर रहे हैं. Meena will handle the RFP by Friday.
                <br />
                <span className="text-cyan">Meena</span> ठीक है, but budget still needs Ankit's sign-off.
              </p>
            </div>
            <div>
              <h2 className="mb-2 text-small text-ink-2">Essence</h2>
              <ul className="space-y-1.5 text-small font-normal">
                {[
                  ["Change vendor for Q3", "decision"],
                  ["Meena sends RFP by Friday", "action"],
                  ["Budget waits on Ankit", "blocker"],
                ].map(([text, kind]) => (
                  <li key={text} className="flex items-start gap-2">
                    <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    <span>
                      {text} <span className="text-ink-2">{kind}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </section>

      <section className="pb-20">
        <div aria-hidden="true" className="mb-6 h-0.5 rounded-full bg-thread" />
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.title}>
              <h2 className="text-h3">{step.title}</h2>
              <p className="mt-1.5 max-w-[32ch] text-body text-ink-2">{step.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Home;
