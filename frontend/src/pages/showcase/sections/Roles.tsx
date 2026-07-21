import { motion } from "framer-motion";
import { GraduationCap, Shield, Users } from "lucide-react";
import { roles } from "../showcase-data";
import { fadeUp, inView } from "../anim";

const ICON = { student: GraduationCap, teacher: Users, admin: Shield };

/** Who it's for — a slim three-up band. */
export default function Roles() {
  return (
    <section id="roles" className="relative z-10 mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-8">
      <motion.div initial="hidden" whileInView="show" viewport={inView} variants={fadeUp} className="mb-10 text-center">
        <span className="text-sm font-bold uppercase tracking-[0.22em] text-[color:var(--sk-pink-deep)]">
          Built for the whole class
        </span>
        <h2 className="sk-display mt-3 text-4xl leading-tight text-[color:var(--sk-ink)] sm:text-5xl">
          One platform, <span className="sk-grad">three journeys</span>.
        </h2>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
        initial="hidden"
        whileInView="show"
        viewport={inView}
        variants={{ show: { transition: { staggerChildren: 0.1 } } }}
      >
        {roles.map((r) => {
          const Icon = ICON[r.key];
          return (
            <motion.div key={r.key} variants={fadeUp} className="sk-glass rounded-[26px] p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sk-pink-wash)] text-[color:var(--sk-pink-deep)]">
                  <Icon className="h-5 w-5" strokeWidth={2.2} />
                </span>
                <div>
                  <div className="sk-display text-xl text-[color:var(--sk-ink)]">{r.label}</div>
                  <div className="text-sm text-[color:var(--sk-ink-soft)]" style={{ fontFamily: "'Baloo 2', cursive" }}>
                    {r.ja}
                  </div>
                </div>
              </div>
              <p className="mt-4 text-[15px] leading-relaxed text-[color:var(--sk-ink-soft)]">{r.line}</p>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
