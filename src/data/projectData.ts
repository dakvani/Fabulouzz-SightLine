export type TaskStatus = "Completed" | "Processing" | "Initiating" | "Planning";

export interface ProjectTask {
  id: number;
  task_number?: number;
  name: string;
  description?: string;
  status: TaskStatus;
  startDay: number; // day offset from Feb 21
  duration: number; // in days
  dependencies?: number[];
}

export interface ProjectInfo {
  title: string;
  client: string;
  projectRef: string;
  projectManager: string;
  reportingTo: string;
  projectEngineer: string;
  location: string;
  company: string;
  startDate: string;
  endDate: string;
  clientContactPerson?: string;
  clientContactPhone?: string;
  contractorContactPerson?: string;
  contractorContactPhone?: string;
}

export const projectInfo: ProjectInfo = {
  title: "Restoration & Rebuilding of CCTV System",
  client: "JIS - TWA",
  projectRef: "PRO-5579R6",
  projectManager: "Riyaz Siraj",
  reportingTo: "Mohammed Burhan",
  projectEngineer: "Muhammed Dakvan",
  location: "KAEC",
  company: "Fabulouzz Technologies",
  startDate: "2026-02-21",
  endDate: "2026-03-23",
  clientContactPerson: "Mohammed Burhan",
  clientContactPhone: "+966 50 123 4567",
  contractorContactPerson: "Riyaz Siraj",
  contractorContactPhone: "+966 54 987 6543",
};

export const tasks: ProjectTask[] = [
  {
    id: 1,
    name: "Design & Site Plan",
    description: "Detailed architecture layout, camera field-of-view survey, mounting location sign-offs, and cable pathway schematic approvals.",
    status: "Completed",
    startDay: 0,
    duration: 3,
  },
  {
    id: 2,
    name: "Purchase & Arrangement of Materials",
    description: "Procurement of Cat6A industrial cabling, weatherproof junction enclosures, PoE+ network switches, NVR storage arrays, and mounting brackets.",
    status: "Processing",
    startDay: 2,
    duration: 5,
    dependencies: [1],
  },
  {
    id: 3,
    name: "Delivery of Equipment & Study of Project Plan on the Site",
    description: "Physical consignment staging, site inspection walkthrough, bill of materials verification, and HSE permit clearance.",
    status: "Completed",
    startDay: 4,
    duration: 3,
    dependencies: [2],
  },
  {
    id: 4,
    name: "Start Cabling and Installation of Outdoor Cameras on Gates and Entrances",
    description: "Conduit trenching, exterior cable pulls, UV-rated trunking, and physical bracket fixture installations across perimeter security gates.",
    status: "Completed",
    startDay: 6,
    duration: 4,
    dependencies: [3],
  },
  {
    id: 5,
    name: "Preparation of Security Room for Installation of New System",
    description: "Rack cabinet dressing, dedicated UPS power line verification, patch panel labeling, and server air conditioning inspection.",
    status: "Processing",
    startDay: 6,
    duration: 3,
    dependencies: [3],
  },
  {
    id: 6,
    name: "Continue Installation of Outside Bullet Cameras on Gates and Connecting Cameras",
    description: "Mounting high-definition IR bullet cameras, glanding connections, grounding surge suppressors, and weather sealing.",
    status: "Processing",
    startDay: 9,
    duration: 3,
    dependencies: [4],
  },
  {
    id: 7,
    name: "Connecting Cameras on the Entrances",
    description: "Patching entrance camera data channels to PoE switches, verifying IP address assignments, and physical link tests.",
    status: "Initiating",
    startDay: 11,
    duration: 2,
    dependencies: [6],
  },
  {
    id: 8,
    name: "Installation of New Server Unit and Activation of License",
    description: "Rack mounting the enterprise NVR server, RAID-6 storage array initialization, OS hardening, and VMS license key activation.",
    status: "Planning",
    startDay: 9,
    duration: 2,
    dependencies: [5],
  },
  {
    id: 9,
    name: "Cabling on the Rooftop for the PTZ Cameras",
    description: "Heavy-duty outdoor Cat6 shielded cabling across roof cable trays, conduit anchoring, and weather-head penetration seals.",
    status: "Planning",
    startDay: 13,
    duration: 3,
    dependencies: [7],
  },
  {
    id: 10,
    name: "Installation of PTZ Cameras on the Rooftop & Activation",
    description: "Rigging parapet mounts, installing 360-degree high-zoom PTZ cameras, power injection, and PTZ telemetry calibration.",
    status: "Planning",
    startDay: 16,
    duration: 2,
    dependencies: [9],
  },
  {
    id: 11,
    name: "Integration of Existing Cameras Inside School",
    description: "Audit existing indoor camera RTSP streams, verify VLAN subnets, update firmware, and register feeds to the central VMS.",
    status: "Planning",
    startDay: 11,
    duration: 3,
    dependencies: [8],
  },
  {
    id: 12,
    name: "Relocation & Rearranging of Avigilon Indoor Cameras to Specific Areas",
    description: "Safely unmounting designated Avigilon dome cameras, relocating to updated supervision zones, and repositioning angle brackets.",
    status: "Planning",
    startDay: 14,
    duration: 2,
    dependencies: [11],
  },
  {
    id: 13,
    name: "Relayout and Pulling Cables for the Relocated Area Cameras",
    description: "Above-ceiling cable re-routing, drop-ceiling bridle ring distribution, and termination at new camera junction points.",
    status: "Planning",
    startDay: 16,
    duration: 2,
    dependencies: [12],
  },
  {
    id: 14,
    name: "Integration of Avigilon Cameras with New System",
    description: "ONVIF protocol discovery, cross-platform streaming configuration, analytics metadata sync, and motion zone mapping.",
    status: "Planning",
    startDay: 18,
    duration: 2,
    dependencies: [13, 10],
  },
  {
    id: 15,
    name: "Configuration and Setup of New System",
    description: "Video retention schedules, continuous/event recording bitrate optimization, operator user roles, and video wall layout design.",
    status: "Planning",
    startDay: 20,
    duration: 2,
    dependencies: [14],
  },
  {
    id: 16,
    name: "Testing & Commissioning of New System",
    description: "24-hour soak test, camera failover testing, night-vision clarity review, UPS emergency power trip test, and latency verification.",
    status: "Planning",
    startDay: 22,
    duration: 3,
    dependencies: [15],
  },
  {
    id: 17,
    name: "Training Client for the SOP of New System",
    description: "Conducting training workshops for security operators, live playback demonstration, incident footage export guidelines, and SOP documentation delivery.",
    status: "Planning",
    startDay: 25,
    duration: 2,
    dependencies: [16],
  },
  {
    id: 18,
    name: "Study of Bug (If Any)",
    description: "Final punch-list resolution, resolving minor camera frame drops, fine-tuning motion alerts, and finalizing system event logs.",
    status: "Planning",
    startDay: 27,
    duration: 2,
    dependencies: [16],
  },
  {
    id: 19,
    name: "Project Handover",
    description: "Formal client sign-off, delivery of as-built CAD drawings, warranty certificate issuance, and operational handover.",
    status: "Planning",
    startDay: 29,
    duration: 1,
    dependencies: [17, 18],
  },
];

export const getStatusColor = (status: TaskStatus): string => {
  switch (status) {
    case "Completed": return "completed";
    case "Processing": return "processing";
    case "Initiating": return "initiating";
    case "Planning": return "planning";
  }
};

export const getStatusCounts = () => {
  return {
    completed: tasks.filter(t => t.status === "Completed").length,
    processing: tasks.filter(t => t.status === "Processing").length,
    initiating: tasks.filter(t => t.status === "Initiating").length,
    planning: tasks.filter(t => t.status === "Planning").length,
    total: tasks.length,
  };
};

export const getOverallProgress = (): number => {
  const weights: Record<TaskStatus, number> = {
    Completed: 1,
    Processing: 0.5,
    Initiating: 0.2,
    Planning: 0,
  };
  const total = tasks.reduce((sum, t) => sum + weights[t.status], 0);
  return Math.round((total / tasks.length) * 100);
};

// Generate calendar days from Feb 21 to Mar 23
export const getCalendarDays = () => {
  const days: { date: Date; label: string; dayOfWeek: string; isWeekend: boolean; monthLabel?: string }[] = [];
  const start = new Date(2026, 1, 21); // Feb 21, 2026
  for (let i = 0; i < 30; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const monthNames = ["Jan", "Feb", "Mar"];
    days.push({
      date: d,
      label: d.getDate().toString(),
      dayOfWeek: dayNames[d.getDay()],
      isWeekend: d.getDay() === 5 || d.getDay() === 6, // Friday/Saturday (Saudi weekend)
      monthLabel: d.getDate() === 1 ? monthNames[d.getMonth()] : undefined,
    });
  }
  return days;
};
