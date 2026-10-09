import "./App.scss";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home.jsx";
import MineLayout from "./pages/Mine/MineLayout.jsx";
import Mine from "./pages/Mine/Mine.jsx";
import VideoPlay from "./pages/videoPlay/VideoPlay.jsx";
import Login from "./pages/Login/Login.jsx";
import History from "./pages/History/History.jsx";
import Search from "./pages/Search/Search.jsx";
import Likes from "./pages/Likes/Likes.jsx";
import Favorites from "./pages/Favorites/Favorites.jsx";
import Subscriptions from "./pages/Subscriptions/Subscriptions.jsx";
import Register from "./pages/Register/Register.jsx";
import Upload from "./pages/Upload/Upload2.jsx";
import Shorts from "./pages/Shorts/Shorts.jsx";
import AgentSearch from "./pages/AgentSearch/AgentSearch.jsx";
import TestAgent from "./pages/testAgent/testAgent.jsx";
import Settings from "./pages/Settings/Settings.jsx";
import Help from "./pages/Help/Help.jsx";
import Feedback from "./pages/Feedback/Feedback.jsx";
import Shorts2 from "./pages/Shorts/Shorts2";
import { Toaster } from "sonner";
import MainLayout from "./layouts/MainLayout.jsx";
import { Spinner } from "@/components/ui/spinner";
import { useSelector } from "react-redux";
import RequireAuth from "./componets/RequireAuth/RequireAuth";
import RouteTransition from "./componets/RouteTransition/RouteTransition";
import TheaterAtmosphere from "./componets/TheaterAtmosphere/TheaterAtmosphere";
import { useTheme } from "./theme/ThemeProvider";
import Agent from "./pages/Agent/Agent";


function App() {
  const pendingCount = useSelector((state) => state.loadingStore.pendingCount);
  const { theme } = useTheme();

  return (
    <div className="App">
      <TheaterAtmosphere />
      <div className="appForeground">
        <Toaster theme={theme} />
        <RouteTransition>
          <Routes>
            <Route path="/Login" element={<Login />} />
            <Route path="/Register" element={<Register />} />

            <Route element={<MainLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/Shorts" element={<Shorts />} />
              <Route path="/Shorts2" element={<Shorts2/>} />

              <Route path="/videoPlay" element={<VideoPlay />} />
              <Route path="/Search" element={<Search />} />
              <Route path="/Agent" element={<AgentSearch />} />
              <Route path="/Agent2" element = {<Agent></Agent>} />
              <Route path="/TestAgent" element={<TestAgent />} />
              <Route path="/Help" element={<Help />} />
              <Route path="/Feedback" element={<Feedback />} />

              <Route element={<RequireAuth />}>
                <Route path="/Settings" element={<Settings />} />
              </Route>

              <Route path="/Mine" element={<MineLayout />}>
                <Route index element={<Mine />} />
                <Route element={<RequireAuth />}>
                  <Route path="History" element={<History />} />
                  <Route path="Likes" element={<Likes />} />
                  <Route path="Favorites" element={<Favorites />} />
                  <Route path="Subscriptions" element={<Subscriptions />} />
                  <Route path="Upload" element={<Upload />} />
                  <Route path="Upload2" element={<Navigate to="/Mine/Upload" replace />} />
                </Route>
              </Route>

              <Route path="/History" element={<Navigate to="/Mine/History" replace />} />
              <Route path="/Likes" element={<Navigate to="/Mine/Likes" replace />} />
              <Route path="/Favorites" element={<Navigate to="/Mine/Favorites" replace />} />
              <Route path="/Subscriptions" element={<Navigate to="/Mine/Subscriptions" replace />} />
              <Route path="/Upload" element={<Navigate to="/Mine/Upload" replace />} />
            </Route>
          </Routes>
          {pendingCount > 0 && (
            <div
              className="fixed inset-0 z-9999 flex items-center justify-center bg-black/45 pointer-events-none"
              aria-busy="true"
              aria-live="polite"
            >
              <Spinner className="size-8" />
            </div>
          )}
        </RouteTransition>
      </div>
    </div>
  );
}

export default App;
