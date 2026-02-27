import { motion } from "framer-motion";
import { Building2, MapPin, User, Users } from "lucide-react";
import { projectInfo } from "@/data/projectData";

const ProjectInfoCard = () => {
  const infoItems = [
    { icon: Building2, label: "Client", value: projectInfo.client },
    { icon: MapPin, label: "Location", value: projectInfo.location },
    { icon: User, label: "PM", value: projectInfo.projectManager },
    { icon: Users, label: "Engineer", value: projectInfo.projectEngineer },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card p-5"
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-mono text-primary tracking-wider">{projectInfo.projectRef}</p>
        <span className="text-xs text-muted-foreground font-mono">{projectInfo.company}</span>
      </div>
      <h2 className="text-lg font-bold text-foreground mb-4 leading-tight">{projectInfo.title}</h2>
      <div className="grid grid-cols-2 gap-3">
        {infoItems.map((item, i) => (
          <div key={item.label} className="flex items-center gap-2">
            <item.icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
              <p className="text-sm text-foreground truncate">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default ProjectInfoCard;
