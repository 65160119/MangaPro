import React from "react";
import { Route, Routes } from "react-router-dom";
import Hello from "../component/hello";
import Catalog from "../pages/Catalog";

export default function AppRoute() {
    return (
        <Routes>
            <Route path="/" element={<Hello />} />
            <Route path="/hello" element={<Hello />} />
            <Route path="/catalog" element={<Catalog />} />
        </Routes>
    );
}