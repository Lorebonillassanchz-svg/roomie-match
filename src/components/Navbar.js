import { useState } from "react";
import FeedbackModal from "./FeedbackModal";

const esFirebasePhoto = (url) =>
  typeof url === "string" && url.startsWith("https://firebasestorage.googleapis.com");

const IconSearch = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IconHeartNav = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);
const IconBulb = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/>
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
  </svg>
);
const IconStore = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 01-8 0"/>
  </svg>
);

export default function Navbar({ pantalla, setPantalla, user, profile, unreadCount = 0 }) {
  const [showFeedback, setShowFeedback] = useState(false);

  const tabs = [
    { id: "explorar",  icon: <IconSearch />,   label: "Candidatos" },
    { id: "perfil",    icon: null,              label: "Mi perfil"  },
    { id: "matches",   icon: <IconHeartNav />,  label: "Conexiones" },
    { id: "servicios", icon: <IconStore />,     label: "Servicios"  },
  ];

  return (
    <>
      <nav style={styles.nav}>
        {tabs.map((tab) => {
          const activa = pantalla === tab.id;
          const accentColor = "#f97316";
          const mutedColor = "var(--app-text-muted, #94a3b8)";
          return (
            <button
              key={tab.id}
              style={styles.tab}
              onClick={() => setPantalla(tab.id)}
              aria-label={tab.label}
            >
              {tab.id === "perfil" ? (
                <div style={{
                  ...styles.avatarWrapper,
                  border: `2px solid ${activa ? accentColor : "var(--app-border, #e5e7eb)"}`,
                }}>
                  {esFirebasePhoto(profile?.photoURL) ? (
                    <img
                      src={profile.photoURL}
                      alt="perfil"
                      style={styles.avatarImg}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span style={styles.avatarLetra}>
                      {profile?.nombre?.[0]?.toUpperCase() || user?.displayName?.[0]?.toUpperCase() || "?"}
                    </span>
                  )}
                </div>
              ) : (
                <div style={styles.iconWrapper}>
                  <span style={{ color: activa ? accentColor : mutedColor, display: "flex" }}>
                    {tab.icon}
                  </span>
                  {tab.id === "matches" && unreadCount > 0 && (
                    <div style={styles.badge} key={unreadCount}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}

        <button style={styles.tab} onClick={() => setShowFeedback(true)} aria-label="Sugerir">
          <span style={{ color: "var(--app-text-muted, #94a3b8)", display: "flex" }}>
            <IconBulb />
          </span>
        </button>
      </nav>

      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </>
  );
}

const styles = {
  nav: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    height: "64px",
    background: "var(--app-surface, #ffffff)",
    borderTop: "1px solid var(--app-border, #e2e0f0)",
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    zIndex: 100,
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  tab: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "10px 0",
    outline: "none",
  },
  iconWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: "-6px",
    right: "-8px",
    minWidth: "16px",
    height: "16px",
    borderRadius: "8px",
    background: "#ef4444",
    color: "#ffffff",
    fontSize: "9px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 3px",
    border: "1.5px solid var(--app-surface, #ffffff)",
  },
  avatarWrapper: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    overflow: "hidden",
    background: "linear-gradient(135deg, #f97316, #7c3aed)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  avatarLetra: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#ffffff",
  },
};
