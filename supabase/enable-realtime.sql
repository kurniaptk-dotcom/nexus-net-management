-- Enable Supabase Realtime on all tables
ALTER PUBLICATION supabase_realtime ADD TABLE pekerjaan;
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE gangguan;
ALTER PUBLICATION supabase_realtime ADD TABLE tim;
ALTER PUBLICATION supabase_realtime ADD TABLE odp_odc;
