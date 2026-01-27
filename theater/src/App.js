import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import "./App.css";

import { StatesProvider } from "./services/states";
import { NotificationProvider } from "./services/notifications";
import Theater from "./pages/Theater";
import Login from "./pages/Login";
import TheatreUploader from "./pages/CreateTheater";
import JoinTheater from "./pages/JoinTheater";

function App() {
  return (
    <Router>
      <StatesProvider>
        <NotificationProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/theater" element={<Theater />} />
            <Route path="/create/theater" element={<TheatreUploader />} />
            <Route path="/join/theater" element={<JoinTheater />} />
          </Routes>
        </NotificationProvider>
      </StatesProvider>
    </Router>
  );
}

export default App;