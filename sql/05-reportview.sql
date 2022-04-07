-- report_view ----------------------------------------------
CREATE VIEW api.report_view AS
SELECT report.id,
  report.source,
  report.source_id,
  report.date,
  report.description,
  report.ts,
  location.city,
  location.district,
  location.country,
  location.continent,
  location.water,
  location.other
FROM report
  JOIN location ON location.id = report.location
ORDER BY report.date DESC;