import { motion } from "framer-motion";
import {
  Building2,
  MapPin,
  User,
  Users,
  Sliders,
  Phone,
  Briefcase,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { useProjectData } from "@/contexts/ProjectDataContext";

interface ProjectInfoCardProps {
  onEditDetails?: () => void;
}

export const ProjectInfoCard = ({ onEditDetails }: ProjectInfoCardProps) => {
  const { projectInfo, canEditProject } = useProjectData();

  const clientContact = projectInfo.clientContactPerson || projectInfo.reportingTo || "Mohammed Burhan";
  const clientPhone = projectInfo.clientContactPhone || "+966 50 123 4567";
  const contractorContact = projectInfo.contractorContactPerson || projectInfo.projectManager || "Riyaz Siraj";
  const contractorPhone = projectInfo.contractorContactPhone || "+966 54 987 6543";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card p-4 sm:p-5 h-full flex flex-col justify-between overflow-hidden relative"
    >
      {/* Top Header Badge & Action */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-mono font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20 tracking-wider truncate">
              {projectInfo.projectRef || "REF"}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono bg-secondary/50 px-2 py-0.5 rounded-full truncate hidden sm:inline">
              {projectInfo.company || "Fabulouzz Technologies"}
            </span>
          </div>

          {onEditDetails && (
            <button
              onClick={onEditDetails}
              className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 px-3 py-1 rounded-full border border-primary/25 transition-all flex-shrink-0 cursor-pointer shadow-sm"
              title="Manage project details and scope"
            >
              <Sliders className="w-3 h-3" />
              <span>{canEditProject ? "Edit Details" : "Details"}</span>
            </button>
          )}
        </div>

        {/* Project Title */}
        <h2 className="text-base sm:text-lg font-bold text-foreground leading-snug tracking-tight mb-1 line-clamp-2">
          {projectInfo.title}
        </h2>

        {/* Site Location & Dates subtitle */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono mb-3">
          <span className="flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 text-primary shrink-0" />
            {projectInfo.location || "Saudi Arabia"}
          </span>
          {projectInfo.startDate && (
            <span className="hidden sm:flex items-center gap-1 shrink-0">
              <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
              {projectInfo.startDate} → {projectInfo.endDate || "Ongoing"}
            </span>
          )}
        </div>
      </div>

      {/* Primary Directory: Client & Contractor (Line by Line) */}
      <div className="space-y-2.5 my-2">
        {/* Row 1: Client Organization & Contact Person with Phone */}
        <div className="p-2.5 rounded-xl bg-secondary/35 border border-border/40 hover:border-primary/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">
                Client Organization
              </span>
              <p className="text-xs font-bold text-foreground truncate">
                {projectInfo.client || "Client Entity"}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                Contact: <strong className="text-foreground/90 font-semibold">{clientContact}</strong>
              </p>
            </div>
          </div>

          {clientPhone && (
            <a
              href={`tel:${clientPhone.replace(/\s+/g, "")}`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-mono font-bold border border-primary/25 transition-colors self-start sm:self-auto shrink-0"
              title={`Call Client Contact (${clientContact})`}
            >
              <Phone className="w-3 h-3 shrink-0" />
              <span>{clientPhone}</span>
            </a>
          )}
        </div>

        {/* Row 2: Contractor (Company doing the job) & Contact Person with Phone */}
        <div className="p-2.5 rounded-xl bg-secondary/35 border border-border/40 hover:border-primary/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <Briefcase className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">
                Contractor (Executing Company)
              </span>
              <p className="text-xs font-bold text-foreground truncate">
                {projectInfo.company || "Fabulouzz Technologies"}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                Contact: <strong className="text-foreground/90 font-semibold">{contractorContact}</strong>
              </p>
            </div>
          </div>

          {contractorPhone && (
            <a
              href={`tel:${contractorPhone.replace(/\s+/g, "")}`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-[10px] font-mono font-bold border border-emerald-500/25 transition-colors self-start sm:self-auto shrink-0"
              title={`Call Contractor Contact (${contractorContact})`}
            >
              <Phone className="w-3 h-3 shrink-0" />
              <span>{contractorPhone}</span>
            </a>
          )}
        </div>
      </div>

      {/* Row 3: Key Personnel (PM & Engineer) */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/25 mt-auto">
        <div className="p-2 rounded-lg bg-secondary/25 flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-secondary/70 flex items-center justify-center shrink-0 text-primary">
            <User className="w-3 h-3" />
          </div>
          <div className="min-w-0">
            <span className="text-[8px] uppercase tracking-wider text-muted-foreground block font-bold">
              Project Manager
            </span>
            <span className="text-xs font-medium text-foreground truncate block">
              {projectInfo.projectManager || "Riyaz Siraj"}
            </span>
          </div>
        </div>

        <div className="p-2 rounded-lg bg-secondary/25 flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-secondary/70 flex items-center justify-center shrink-0 text-primary">
            <Users className="w-3 h-3" />
          </div>
          <div className="min-w-0">
            <span className="text-[8px] uppercase tracking-wider text-muted-foreground block font-bold">
              Lead Engineer
            </span>
            <span className="text-xs font-medium text-foreground truncate block">
              {projectInfo.projectEngineer || "Muhammed Dakvan"}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProjectInfoCard;
