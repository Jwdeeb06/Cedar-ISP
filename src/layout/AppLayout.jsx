import { Box } from "@mui/material";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import "./AppLayout.css";

const drawerWidth = 240;

export default function AppLayout() {
  return (
    <Box className="appRoot">
      <Navbar drawerWidth={drawerWidth} title="ISP Management" />
      <Sidebar drawerWidth={drawerWidth} />

      <Box component="main" className="appMain">
        <Outlet />
      </Box>
    </Box>
  );
}