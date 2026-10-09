import React, { memo } from "react";
import NavBar from "@/componets/NavBar";
import ContentFadeHost from "@/componets/ContentFadeHost/ContentFadeHost";

const MainLayout = memo(() => {
  return (
    <>
      <NavBar />

      <div className="flex">
        <main className="flex-1 min-w-0 bg-transparent" style={{ marginTop: "var(--header-offset)" }}>
          <ContentFadeHost />
        </main>
      </div>
    </>
  );
});

export default MainLayout;
