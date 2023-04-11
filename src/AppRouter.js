/* eslint-disable */ 
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { get as _get } from "lodash"
import "./App.css";

// pages
import Layout from "./components/Layout";
import Bridge from "./pages/Bridge";
import Redeem from "./pages/Redeem";
import NotFound from "./pages/NotFound"

function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>

          <Route path='*' element={<NotFound />} />
          <Route path="/" element={<Navigate replace to="/bridge" />} />
          <Route path="/bridge" element={<Bridge />} />
          <Route path="/redeem" element={<Redeem />} />
          
        </Route>
      </Routes>
    </Router>
  );
}

export default AppRouter;