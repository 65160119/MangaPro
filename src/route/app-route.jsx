import React from "react";
import { Route, Routes } from "react-router-dom";
import Catalog from "../pages/Catalog";
import Forum from "../pages/Forum";
import Random from "../pages/Random";

export default function AppRoute() {
    return (
        <Routes>
            <Route path="/" element={<Catalog />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/forum" element={<Forum />} />
            <Route path="/random" element={<Random />} />
        </Routes>
    );
}