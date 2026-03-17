import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Calendar, Eye, Globe, Monitor, Smartphone, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface DailyVisitorData {
  date: string;
  total_visits: number;
  unique_visitors: number;
}

interface PageVisitData {
  page_path: string;
  visit_count: number;
}

interface RecentVisit {
  id: string;
  visitor_id: string;
  page_path: string;
  visited_at: string;
  user_agent: string;
}

const VisitorAnalyticsTab = () => {
  const [totalVisitors, setTotalVisitors] = useState(0);
  const [todayVisitors, setTodayVisitors] = useState(0);
  const [totalPageViews, setTotalPageViews] = useState(0);
  const [thisMonthVisitors, setThisMonthVisitors] = useState(0);
  const [dailyData, setDailyData] = useState<DailyVisitorData[]>([]);
  const [pageData, setPageData] = useState<PageVisitData[]>([]);
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const daysAgo = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      const startDateStr = startDate.toISOString();

      // Fetch overview stats
      const [statsRes, totalRes, monthRes] = await Promise.all([
        fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/visitor_stats?select=*`,
          {
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            },
          }
        ),
        fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/page_visits?select=id&limit=1&offset=0`,
          {
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
              Prefer: "count=exact",
            },
          }
        ),
        fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/page_visits?select=visitor_id&visited_at=gte.${new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()}`,
          {
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            },
          }
        ),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        if (data?.[0]) {
          setTotalVisitors(Number(data[0].total_visitors) || 0);
          setTodayVisitors(Number(data[0].today_visitors) || 0);
        }
      }

      const totalCount = totalRes.headers.get("content-range");
      if (totalCount) {
        const match = totalCount.match(/\/(\d+)/);
        if (match) setTotalPageViews(parseInt(match[1]));
      }

      if (monthRes.ok) {
        const monthData = await monthRes.json();
        const uniqueThisMonth = new Set(monthData.map((r: { visitor_id: string }) => r.visitor_id));
        setThisMonthVisitors(uniqueThisMonth.size);
      }

      // Fetch daily breakdown using raw REST query
      const dailyRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/page_visits?select=visitor_id,visited_at&visited_at=gte.${startDateStr}&order=visited_at.desc`,
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        }
      );

      if (dailyRes.ok) {
        const rawData = await dailyRes.json();
        // Aggregate by date
        const dateMap = new Map<string, { visits: number; visitors: Set<string> }>();
        rawData.forEach((row: { visited_at: string; visitor_id: string }) => {
          const date = row.visited_at.split("T")[0];
          if (!dateMap.has(date)) {
            dateMap.set(date, { visits: 0, visitors: new Set() });
          }
          const entry = dateMap.get(date)!;
          entry.visits++;
          entry.visitors.add(row.visitor_id);
        });

        const daily: DailyVisitorData[] = Array.from(dateMap.entries())
          .map(([date, data]) => ({
            date,
            total_visits: data.visits,
            unique_visitors: data.visitors.size,
          }))
          .sort((a, b) => b.date.localeCompare(a.date));
        setDailyData(daily);

        // Aggregate by page
        const pageMap = new Map<string, number>();
        rawData.forEach((row: { page_path?: string; visited_at: string }) => {
          // page_path might not be in this query, fetch separately
        });
      }

      // Fetch page-wise data
      const pageRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/page_visits?select=page_path&visited_at=gte.${startDateStr}`,
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        }
      );

      if (pageRes.ok) {
        const pageRaw = await pageRes.json();
        const pageMap = new Map<string, number>();
        pageRaw.forEach((row: { page_path: string }) => {
          pageMap.set(row.page_path, (pageMap.get(row.page_path) || 0) + 1);
        });
        const pages: PageVisitData[] = Array.from(pageMap.entries())
          .map(([page_path, visit_count]) => ({ page_path, visit_count }))
          .sort((a, b) => b.visit_count - a.visit_count);
        setPageData(pages);
      }

      // Fetch recent visits
      const recentRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/page_visits?select=id,visitor_id,page_path,visited_at,user_agent&order=visited_at.desc&limit=50`,
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        }
      );

      if (recentRes.ok) {
        setRecentVisits(await recentRes.json());
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast({ title: "Error fetching analytics", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const getDeviceType = (ua: string): string => {
    if (/mobile|android|iphone|ipad/i.test(ua)) return "Mobile";
    if (/tablet/i.test(ua)) return "Tablet";
    return "Desktop";
  };

  const getBrowser = (ua: string): string => {
    if (/chrome/i.test(ua) && !/edge/i.test(ua)) return "Chrome";
    if (/firefox/i.test(ua)) return "Firefox";
    if (/safari/i.test(ua) && !/chrome/i.test(ua)) return "Safari";
    if (/edge/i.test(ua)) return "Edge";
    return "Other";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ta-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ta-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const pageNameMap: Record<string, string> = {
    "/": "முகப்பு (Home)",
    "/about": "எங்களைப் பற்றி (About)",
    "/donation": "நன்கொடை (Donation)",
    "/events": "நிகழ்வுகள் (Events)",
    "/contact": "தொடர்பு (Contact)",
    "/gallery": "புகைப்படங்கள் (Gallery)",
    "/services": "சேவைகள் (Services)",
    "/mahal-booking": "மஹால் முன்பதிவு (Booking)",
    "/grievances": "குறைதீர்ப்பு (Grievances)",
    "/login": "உள்நுழைவு (Login)",
    "/members": "உறுப்பினர்கள் (Members)",
    "/admin": "நிர்வாகம் (Admin)",
    "/superadmin": "சூப்பர் நிர்வாகம் (Super Admin)",
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 bg-muted/50 animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">மொத்த பார்வையாளர்கள்</p>
                <p className="text-2xl font-bold">{totalVisitors.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Unique Visitors</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Calendar className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">இன்றைய பார்வையாளர்கள்</p>
                <p className="text-2xl font-bold">{todayVisitors.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Today's Visitors</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Eye className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">மொத்த பக்க பார்வைகள்</p>
                <p className="text-2xl font-bold">{totalPageViews.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Page Views</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Globe className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">இம்மாத பார்வையாளர்கள்</p>
                <p className="text-2xl font-bold">{thisMonthVisitors.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">This Month Visitors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Range Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">காலம்:</span>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">கடந்த 7 நாட்கள்</SelectItem>
            <SelectItem value="30">கடந்த 30 நாட்கள்</SelectItem>
            <SelectItem value="90">கடந்த 90 நாட்கள்</SelectItem>
            <SelectItem value="365">கடந்த 1 வருடம்</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchAnalytics}>
          புதுப்பிக்க
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Report */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">தினசரி அறிக்கை (Daily Report)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>தேதி</TableHead>
                    <TableHead className="text-right">பக்க பார்வைகள்</TableHead>
                    <TableHead className="text-right">பார்வையாளர்கள்</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        தரவு இல்லை
                      </TableCell>
                    </TableRow>
                  ) : (
                    dailyData.map((row) => (
                      <TableRow key={row.date}>
                        <TableCell className="font-medium">{formatDate(row.date)}</TableCell>
                        <TableCell className="text-right">{row.total_visits}</TableCell>
                        <TableCell className="text-right">{row.unique_visitors}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Page-wise Report */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">பக்கவாரி அறிக்கை (Page Report)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>பக்கம்</TableHead>
                    <TableHead className="text-right">பார்வைகள்</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        தரவு இல்லை
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageData.map((row) => (
                      <TableRow key={row.page_path}>
                        <TableCell className="font-medium">
                          {pageNameMap[row.page_path] || row.page_path}
                        </TableCell>
                        <TableCell className="text-right">{row.visit_count}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Visits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">சமீபத்திய பார்வைகள் (Recent Visits)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>நேரம்</TableHead>
                  <TableHead>பக்கம்</TableHead>
                  <TableHead>சாதனம்</TableHead>
                  <TableHead>உலாவி</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentVisits.map((visit) => (
                  <TableRow key={visit.id}>
                    <TableCell className="text-sm">{formatDateTime(visit.visited_at)}</TableCell>
                    <TableCell className="text-sm">
                      {pageNameMap[visit.page_path] || visit.page_path}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getDeviceType(visit.user_agent) === "Mobile" ? (
                          <Smartphone className="h-3 w-3" />
                        ) : (
                          <Monitor className="h-3 w-3" />
                        )}
                        <span className="text-sm">{getDeviceType(visit.user_agent)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{getBrowser(visit.user_agent)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VisitorAnalyticsTab;
