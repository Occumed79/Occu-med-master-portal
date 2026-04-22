import PortalMap from '../components/PortalMap';
import { motion } from 'framer-motion';

export default function Home() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7 }}
      className="h-full w-full"
    >
      <PortalMap />
    </motion.div>
  );
}
