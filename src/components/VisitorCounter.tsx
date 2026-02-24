import { motion } from "framer-motion";
import { Users, Calendar, Activity } from "lucide-react";
import { useVisitorTracking } from "@/hooks/useVisitorTracking";

const VisitorCounter = () => {
  const { stats, isLoading } = useVisitorTracking();

  const counterItems = [
    {
      label: "மொத்த பார்வையாளர்கள்",
      labelEn: "Total Visitors",
      value: stats.totalVisitors,
      icon: Users,
      iconColor: "text-secondary",
      bgColor: "bg-white/20",
    },
    {
      label: "இன்றைய பார்வையாளர்கள்",
      labelEn: "Today",
      value: stats.todayVisitors,
      icon: Calendar,
      iconColor: "text-secondary",
      bgColor: "bg-white/20",
    },
    {
      label: "நேரடி பார்வையாளர்கள்",
      labelEn: "Live Now",
      value: stats.liveVisitors,
      icon: Activity,
      iconColor: "text-green-400",
      bgColor: "bg-white/20",
      isLive: true,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-6 py-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 w-28 bg-muted/50 animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="flex flex-wrap items-center justify-center gap-4 md:gap-6"
    >
      {counterItems.map((item, index) => (
        <motion.div
          key={item.labelEn}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 + index * 0.1 }}
          className={`flex items-center gap-3 px-4 py-2 rounded-lg ${item.bgColor} backdrop-blur-sm border border-white/20`}
        >
          <div className={`${item.iconColor} relative`}>
            <item.icon className="h-5 w-5" />
            {item.isLive && (
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-400 rounded-full animate-pulse" />
            )}
          </div>
          <div className="text-left">
            <p className="text-lg font-bold text-white leading-none">
              {item.value.toLocaleString()}
            </p>
            <p className="text-xs text-white/90 font-tamil">{item.label}</p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default VisitorCounter;
