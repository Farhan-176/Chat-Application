import { motion } from 'framer-motion'
import {
  ArrowRight,
  BarChart3,
  Clock3,
  Globe,
  Lock,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
} from 'lucide-react'
import './LandingPage.css'

interface LandingPageProps {
  onGetStarted: () => void
}

export const LandingPage = ({ onGetStarted }: LandingPageProps) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.15 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  const featureCards = [
    {
      icon: <ShieldCheck size={20} />,
      title: 'Security by Default',
      description:
        'Workspace-level isolation, policy controls, and detailed audit logs for every action.',
    },
    {
      icon: <MessageSquare size={20} />,
      title: 'Real-Time Messaging',
      description:
        'Low-latency chat, threads, and reactions that keep distributed teams aligned minute by minute.',
    },
    {
      icon: <Workflow size={20} />,
      title: 'Ops Automation',
      description:
        'Route conversations into workflows, alerts, and approvals without adding process overhead.',
    },
    {
      icon: <BarChart3 size={20} />,
      title: 'Live Intelligence',
      description:
        'Track engagement, response times, and delivery metrics with decision-ready dashboards.',
    },
    {
      icon: <Globe size={20} />,
      title: 'Global Performance',
      description:
        'Reliable collaboration across regions, devices, and teams with stable global throughput.',
    },
    {
      icon: <Lock size={20} />,
      title: 'Enterprise Compliance',
      description:
        'Built to support high-governance requirements and custom compliance workflows.',
    },
  ]

  const liveSignals = [
    { label: 'Live rooms', value: '18', detail: 'active across workspaces' },
    { label: 'Response time', value: '< 45s', detail: 'median reply window' },
    { label: 'Automation', value: 'On', detail: 'workflow triggers enabled' },
  ]

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="landing-logo">NexusChat</div>
        <div className="nav-links">
          <a href="#features" className="nav-link">Features</a>
          <a href="#workflow" className="nav-link">Workflow</a>
          <a href="#enterprise" className="nav-link">Enterprise</a>
          <button className="nav-cta" onClick={onGetStarted}>Launch App</button>
        </div>
      </nav>

      <section className="hero-section">
        <div className="hero-grid">
          <div className="hero-copy">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="hero-tag"
            >
              Built for serious teams, not chat noise.
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              Where critical work
              <br />
              feels radically current.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              NexusChat combines dependable messaging, policy-grade controls, and
              workflow automation into one platform teams actually enjoy using.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="hero-btns"
            >
              <button className="primary-btn" onClick={onGetStarted}>
                Start Free Trial
                <ArrowRight size={16} />
              </button>
              <a href="#features" className="secondary-btn">See Platform Tour</a>
            </motion.div>

            <motion.div
              className="hero-metrics"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={itemVariants} className="metric-item">
                <Users size={16} />
                <span>2,300+ active teams</span>
              </motion.div>
              <motion.div variants={itemVariants} className="metric-item">
                <Clock3 size={16} />
                <span>Median response under 45s</span>
              </motion.div>
              <motion.div variants={itemVariants} className="metric-item">
                <Sparkles size={16} />
                <span>Automation-ready by default</span>
              </motion.div>
            </motion.div>
          </div>

          <motion.div
            className="hero-visual"
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.75, delay: 0.2 }}
          >
            <div className="hero-console">
              <div className="hero-console-header">
                <div>
                  <span className="hero-console-label">Live workspace</span>
                  <strong>Operations stream</strong>
                </div>
                <span className="hero-console-chip">Ready</span>
              </div>

              <div className="hero-console-body">
                <div className="hero-console-thread hero-console-thread--lead">
                  <span className="thread-avatar">AI</span>
                  <div>
                    <strong>Design review in progress</strong>
                    <p>The new launch flow is aligned and waiting for final approval.</p>
                  </div>
                </div>
                <div className="hero-console-thread">
                  <span className="thread-avatar thread-avatar--alt">UX</span>
                  <div>
                    <strong>Room health</strong>
                    <p>18 active rooms · 94% response coverage · 3 escalations closed.</p>
                  </div>
                </div>

                <div className="hero-signal-grid">
                  {liveSignals.map((signal) => (
                    <div key={signal.label} className="hero-signal-card">
                      <span>{signal.label}</span>
                      <strong>{signal.value}</strong>
                      <p>{signal.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="features-section" id="features">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="section-header"
        >
          <span className="section-tag">Platform Capabilities</span>
          <h2>Designed for focus, speed, and control.</h2>
          <p>
            Every part of the experience is tuned for high-velocity organizations
            that care about reliability and outcomes.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="feature-grid"
        >
          {featureCards.map((feature) => (
            <motion.div key={feature.title} variants={itemVariants} className="feature-card">
              <div className="icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="workflow-section" id="workflow">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="workflow-panel"
        >
          <div className="workflow-copy">
            <span className="section-tag">Operational Workflow</span>
            <h2>From message to action in three clean steps.</h2>
            <p>
              Reduce context switching by turning important conversations into
              assignments, approvals, and live status updates in one place.
            </p>
            <button className="inline-cta" onClick={onGetStarted}>Create Workspace</button>
          </div>

          <div className="workflow-steps">
            <div className="step-card">
              <span>01</span>
              <h3>Capture</h3>
              <p>Collect updates across rooms, teams, and external integrations.</p>
            </div>
            <div className="step-card">
              <span>02</span>
              <h3>Route</h3>
              <p>Trigger ownership, rules, and escalation based on priority.</p>
            </div>
            <div className="step-card">
              <span>03</span>
              <h3>Resolve</h3>
              <p>Close loops faster with shared visibility and accountable handoffs.</p>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="enterprise-section" id="enterprise">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="section-header"
        >
          <span className="section-tag">Enterprise Ready</span>
          <h2>Predictable delivery for mission-critical operations.</h2>
          <p>Roll out confidently with high availability, governance, and support.</p>
        </motion.div>

        <div className="enterprise-grid">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="enterprise-card"
          >
            <h3>99.99% Uptime SLA</h3>
            <p>Multi-region architecture, proactive monitoring, and reliable failover posture.</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="enterprise-card highlight"
          >
            <span className="enterprise-badge">Most Chosen</span>
            <h3>Pro Plan - $19/mo</h3>
            <p>5 workspaces, 50 members, automation, file sharing, and priority assistance.</p>
            <button className="enterprise-cta" onClick={onGetStarted}>Start Free Trial</button>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="enterprise-card"
          >
            <h3>Dedicated Support</h3>
            <p>Get onboarding guidance, migration planning, and an account partner that knows your stack.</p>
          </motion.div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-content">
          © 2026 NexusChat. All rights reserved.
        </div>
      </footer>
    </div>
  )
}

