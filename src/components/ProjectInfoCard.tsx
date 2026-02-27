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
      className="glass-card p-4 h-full flex flex-col"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-mono text-primary tracking-wider font-semibold">{projectInfo.projectRef}</p>
        <span className="text-[10px] text-muted-foreground font-mono bg-secondary/50 px-2 py-0.5 rounded-full">{projectInfo.company}</span>
      </div>
      <h2 className="text-base font-bold text-foreground mb-3 leading-snug">{projectInfo.title}</h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mt-auto">
        {infoItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-secondary/60 flex items-center justify-center flex-shrink-0">
              <item.icon className="w-3.5 h-3.5 text-primary/70" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest">{item.label}</p>
              <p className="text-xs font-medium text-foreground truncate">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default ProjectInfoCard;
