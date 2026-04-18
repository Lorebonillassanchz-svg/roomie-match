const esFirebasePhoto = (url) =>
  typeof url === "string" && url.startsWith("https://firebasestorage.googleapis.com");

export default function Navbar({ pantalla, setPantalla, user, profile, unreadCount = 0, isAdmin = false, onAdminClick }) {
  const tabs = [
    { id: "explorar", emoji: "🔍", label: "Candidatos" },
    { id: "perfil",   emoji: null,  label: "Mi perfil"  },
    { id: "matches",  emoji: "💬",  label: "Conexiones" },
  ];

  return (
    <nav style={styles.nav}>
      {tabs.map((tab) => {
        const activa = pantalla === tab.id;
        return (
          <button
            key={tab.id}
            style={{ ...styles.tab, ...(activa ? styles.tabActiva : {}) }}
            onClick={() => setPantalla(tab.id)}
          >
            {tab.id === "perfil" ? (
              <div style={{ ...styles.avatarWrapper, ...(activa ? styles.avatarActivo : {}) }}>
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
              <div style={styles.emojiWrapper}>
                <span style={{ ...styles.emoji, ...(activa ? styles.emojiActivo : {}) }}>
                  {tab.emoji}
                </span>
                {tab.id === "matches" && unreadCount > 0 && (
                  <div style={styles.badge} key={unreadCount}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </div>
                )}
              </div>
            )}
            <span style={{ ...styles.label, ...(activa ? styles.labelActivo : {}) }}>
              {tab.label}
            </span>
          </button>
        );
      })}

      {isAdmin && (
        <button style={styles.tab} onClick={onAdminClick}>
          <span style={{ ...styles.emoji, opacity: 1, filter: "none" }}>⚙️</span>
          <span style={{ ...styles.label, color: "#7c3aed", fontWeight: "600" }}>Admin</span>
        </button>
      )}
    </nav>
  );
}

const styles = {
  nav: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    height: "68px",
    background: "#ffffff",
    borderTop: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    zIndex: 100,
    boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  tab: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px 0",
    outline: "none",
  },
  tabActiva: {},
  emoji: {
    fontSize: "22px",
    lineHeight: 1,
    filter: "grayscale(30%)",
    opacity: 0.5,
  },
  emojiActivo: {
    filter: "none",
    opacity: 1,
  },
  label: {
    fontSize: "11px",
    fontWeight: "500",
    color: "#9ca3af",
  },
  labelActivo: {
    color: "#7c3aed",
    fontWeight: "700",
  },
  avatarWrapper: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    overflow: "hidden",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid #e5e7eb",
  },
  avatarActivo: {
    border: "2px solid #7c3aed",
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
  emojiWrapper: {
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
    border: "1.5px solid #ffffff",
  },
};
