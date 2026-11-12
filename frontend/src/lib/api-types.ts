/**
 * This file was built by openapi-typescript.
 * Do not make direct changes to the file.
 */

export interface paths {
    "/api/v1/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Health Check v1 */
        get: operations["health_check_api_v1_health_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Health Check */
        get: operations["health_check_health_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** System Status */
        get: operations["system_status_api_v1_system_status_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/info": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** System Information (Legacy) */
        get: operations["system_info_api_v1_system_info_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/config/scoring": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Scoring and Rules Configuration */
        get: operations["get_scoring_config_api_v1_config_scoring_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/overview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Dashboard Overview Summary */
        get: operations["get_overview_api_v1_overview_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/tanks": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List all tank profiles */
        get: operations["list_tanks_api_v1_tanks_get"];
        put?: never;
        /** Create a tank profile */
        post: operations["create_tank_api_v1_tanks_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/tanks/{tank_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get tank profile by ID */
        get: operations["get_tank_api_v1_tanks__tank_id__get"];
        /** Update tank profile */
        put: operations["update_tank_api_v1_tanks__tank_id__put"];
        post?: never;
        /** Delete tank and its data */
        delete: operations["delete_tank_api_v1_tanks__tank_id__delete"];
        options?: never;
        head?: never;
        /** Update tank profile */
        patch: operations["update_tank_api_v1_tanks__tank_id__patch"];
        trace?: never;
    };
    "/api/v1/videos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Upload a tank video and start analysis */
        post: operations["upload_video_api_v1_videos_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/jobs/{job_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get analysis job status and progress */
        get: operations["get_job_api_v1_jobs__job_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/jobs/{job_id}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Cancel a queued or running analysis job */
        post: operations["cancel_job_api_v1_jobs__job_id__cancel_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/results/{job_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get full analysis result */
        get: operations["get_result_api_v1_results__job_id__get"];
        put?: never;
        post?: never;
        /** Delete analysis result */
        delete: operations["delete_result_api_v1_results__job_id__delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/results/{job_id}/video": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Stream annotated video */
        get: operations["get_annotated_video_api_v1_results__job_id__video_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/results/{job_id}/frames/{frame_name}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get key frame image */
        get: operations["get_key_frame_api_v1_results__job_id__frames__frame_name__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/results/{job_id}/report.pdf": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Download PDF report */
        get: operations["get_pdf_report_api_v1_results__job_id__report_pdf_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/results/{job_id}/restore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Restore result from recycle bin */
        post: operations["restore_analysis_api_v1_results__job_id__restore_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/{job_id}.pdf": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Download PDF report (alias) */
        get: operations["get_pdf_report_api_v1_reports__job_id__pdf_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/history": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get paginated history of analyses */
        get: operations["get_history_api_v1_history_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/trash": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get analyses in recycle bin */
        get: operations["list_trash_api_v1_trash_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/trash/purge": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Purge expired trash immediately */
        post: operations["purge_trash_api_v1_trash_purge_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/trash/{job_id}/restore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Restore result from recycle bin (alias) */
        post: operations["restore_trash_alias_api_v1_trash__job_id__restore_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/insights": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get tank insights and FSI */
        get: operations["get_insights_api_v1_insights_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/alerts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List system alerts */
        get: operations["list_alerts_api_v1_alerts_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/alerts/{alert_id}/read": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Mark alert as read */
        post: operations["mark_alert_read_api_v1_alerts__alert_id__read_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/alerts/read-all": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Mark all alerts as read */
        post: operations["mark_all_alerts_read_api_v1_alerts_read_all_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/settings/alerts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get alert settings */
        get: operations["get_alert_settings_api_v1_settings_alerts_get"];
        /** Update alert settings */
        put: operations["update_alert_settings_api_v1_settings_alerts_put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/resources": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List curated resource library items */
        get: operations["list_resources_api_v1_resources_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/resources/{resource_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get metadata for a specific resource */
        get: operations["get_resource_api_v1_resources__resource_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/resources/{resource_id}/file": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Download resource attachment */
        get: operations["download_resource_file_api_v1_resources__resource_id__file_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/resources/{resource_id}/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Inline preview or stream of resource */
        get: operations["preview_resource_api_v1_resources__resource_id__preview_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/resources/{resource_id}/thumb": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get resource thumbnail */
        get: operations["get_resource_thumbnail_api_v1_resources__resource_id__thumb_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/demo/seed": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Seed sample demo tank and results */
        post: operations["seed_demo_data_api_v1_demo_seed_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** AlertResponse */
        AlertResponse: {
            /** Id */
            id: string;
            /** Tank Id */
            tank_id: string;
            /** Result Id */
            result_id?: string | null;
            /** Severity */
            severity: string;
            /** Message */
            message: string;
            /** Created At */
            created_at: string;
            /** Read */
            read: boolean;
        };
        /** AlertSettingsResponse */
        AlertSettingsResponse: {
            /** Dashboard Popup */
            dashboard_popup: boolean;
            /** Email Enabled */
            email_enabled: boolean;
            /** Email To */
            email_to?: string | null;
        };
        /** AlertSettingsUpdate */
        AlertSettingsUpdate: {
            /** Dashboard Popup */
            dashboard_popup?: boolean | null;
            /** Email Enabled */
            email_enabled?: boolean | null;
            /** Email To */
            email_to?: string | null;
        };
        /** Body_upload_video_api_v1_videos_post */
        Body_upload_video_api_v1_videos_post: {
            /** File */
            file: string;
            /** Tank Id */
            tank_id: string;
            /**
             * View
             * @default side
             */
            view: string;
            /** Water Temp C */
            water_temp_c?: string;
            /** Last Water Change Days */
            last_water_change_days?: string;
            /** Last Fed Hours */
            last_fed_hours?: string;
        };
        /** DemoSeedResponse */
        DemoSeedResponse: {
            /** Tank Id */
            tank_id: string;
            /** Result Ids */
            result_ids: string[];
        };
        /** DetectionStats */
        DetectionStats: {
            /**
             * Frames Total
             * @default 0
             */
            frames_total: number;
            /**
             * Frames Processed
             * @default 0
             */
            frames_processed: number;
            /**
             * Frames With Detections Pct
             * @default 0
             */
            frames_with_detections_pct: number;
            /**
             * Id Switch Estimate
             * @default 0
             */
            id_switch_estimate: number;
        };
        /** DetectorsMap */
        DetectorsMap: {
            /**
             * Baseline
             * @default true
             */
            baseline: boolean;
            /**
             * Onnx
             * @default false
             */
            onnx: boolean;
            /**
             * External
             * @default false
             */
            external: boolean;
        };
        /** FishMetrics */
        FishMetrics: {
            /** Speed Bl S */
            speed_bl_s: number;
            /** Direction Change Rate */
            direction_change_rate: number;
            /** Isolation Ratio */
            isolation_ratio: number;
            /** Surface Ratio */
            surface_ratio: number;
            /** Bottom Ratio */
            bottom_ratio: number;
            /** Inactivity Ratio */
            inactivity_ratio: number;
        };
        /** FishPoint */
        FishPoint: {
            /** Flag */
            flag: string;
            /** Points */
            points: number;
        };
        /** FishResult */
        FishResult: {
            /** Id */
            id: string;
            /** Score */
            score: number;
            /** Stressed */
            stressed: boolean;
            /** Flags */
            flags: string[];
            metrics: components["schemas"]["FishMetrics"];
            /** Points */
            points: components["schemas"]["FishPoint"][];
            /** Explanation */
            explanation: string;
            /** Timeline */
            timeline: components["schemas"]["TimelinePoint"][];
            /**
             * Confidence
             * @default 1
             */
            confidence: number;
        };
        /** HTTPValidationError */
        HTTPValidationError: {
            /** Detail */
            detail?: components["schemas"]["ValidationError"][];
        };
        /** HistoryItem */
        HistoryItem: {
            /** Id */
            id: string;
            /** Tank Id */
            tank_id: string;
            /** Tank Name */
            tank_name: string;
            /** Created At */
            created_at: string;
            /** Tank Score */
            tank_score: number;
            /** Level */
            level: string;
            /** Stressed Count */
            stressed_count: number;
            /** Fish Count */
            fish_count: number;
            /** Duration S */
            duration_s: number;
            /** Mode */
            mode: string;
        };
        /** InsightSeriesPoint */
        InsightSeriesPoint: {
            /** Date */
            date: string;
            /** Score */
            score: number;
        };
        /** InsightsResponse */
        InsightsResponse: {
            /** Tank Id */
            tank_id: string;
            /** Fsi */
            fsi?: number | null;
            /** Level */
            level?: string | null;
            /** Trend */
            trend: string;
            /** Series */
            series: components["schemas"]["InsightSeriesPoint"][];
            /** Messages */
            messages: string[];
        };
        /** JobResponse */
        JobResponse: {
            /** Id */
            id: string;
            /** Video Id */
            video_id: string;
            /** Tank Id */
            tank_id: string;
            /** Status */
            status: string;
            /** Stage */
            stage: string;
            /** Progress */
            progress: number;
            /**
             * Queue Position
             * @default 0
             */
            queue_position: number;
            /** Error */
            error?: string | null;
            /** Analyzer */
            analyzer: string;
            /** Created At */
            created_at: string;
            /** Started At */
            started_at?: string | null;
            /** Finished At */
            finished_at?: string | null;
        };
        /** KeyMoment */
        KeyMoment: {
            /** T */
            t: number;
            /** Fish */
            fish: string;
            /** Behaviour */
            behaviour: string;
            /** Label */
            label: string;
            /** Frame Url */
            frame_url: string;
        };
        /** OverviewResponse */
        OverviewResponse: {
            /** Tanks Count */
            tanks_count: number;
            /** Analyses Count */
            analyses_count: number;
            /** Analyses This Week */
            analyses_this_week: number;
            /** Flagged Fish Count */
            flagged_fish_count: number;
            /** Unread Alerts Count */
            unread_alerts_count: number;
            /** Tanks */
            tanks: components["schemas"]["TankOverviewSummary"][];
            /** Recent Analyses */
            recent_analyses: components["schemas"]["RecentAnalysisSummary"][];
            /** Priority Alerts */
            priority_alerts: components["schemas"]["PriorityAlertSummary"][];
            /** Recommended Actions */
            recommended_actions: {
                [key: string]: unknown;
            }[];
        };
        /** PagedHistory */
        PagedHistory: {
            /** Items */
            items: components["schemas"]["HistoryItem"][];
            /** Total */
            total: number;
            /** Page */
            page: number;
            /** Page Size */
            page_size: number;
        };
        /** PriorityAlertSummary */
        PriorityAlertSummary: {
            /** Id */
            id: string;
            /** Tank Id */
            tank_id: string;
            /** Severity */
            severity: string;
            /** Message */
            message: string;
            /** Created At */
            created_at: string;
        };
        /** PurgeResponse */
        PurgeResponse: {
            /** Purged */
            purged: number;
        };
        /** RecentAnalysisSummary */
        RecentAnalysisSummary: {
            /** Id */
            id: string;
            /** Tank Id */
            tank_id: string;
            /** Tank Name */
            tank_name: string;
            /** Created At */
            created_at: string;
            /** Tank Score */
            tank_score: number;
            /** Level */
            level: string;
            /** Stressed Count */
            stressed_count: number;
            /** Fish Count */
            fish_count: number;
            /** Mode */
            mode: string;
        };
        /** ReliabilityInfo */
        ReliabilityInfo: {
            /**
             * Level
             * @default high
             */
            level: string;
            /**
             * Score
             * @default 100
             */
            score: number;
            /**
             * Reasons
             * @default []
             */
            reasons: string[];
            /**
             * Tips
             * @default []
             */
            tips: string[];
            metrics?: components["schemas"]["ReliabilityMetrics"];
        };
        /** ReliabilityMetrics */
        ReliabilityMetrics: {
            /**
             * Brightness
             * @default 0
             */
            brightness: number;
            /**
             * Contrast
             * @default 0
             */
            contrast: number;
            /**
             * Sharpness
             * @default 0
             */
            sharpness: number;
            /**
             * Shake Px
             * @default 0
             */
            shake_px: number;
            /**
             * Coverage Pct
             * @default 0
             */
            coverage_pct: number;
            /**
             * Fish Expected
             * @default 0
             */
            fish_expected: number;
            /**
             * Fish Tracked
             * @default 0
             */
            fish_tracked: number;
            /**
             * Fish Median Px
             * @default 0
             */
            fish_median_px: number;
            /**
             * Fps
             * @default 0
             */
            fps: number;
            /**
             * Width
             * @default 0
             */
            width: number;
            /**
             * Height
             * @default 0
             */
            height: number;
        };
        /** ResultResponse */
        ResultResponse: {
            /** Job Id */
            job_id: string;
            /** Mode */
            mode: string;
            tank: components["schemas"]["ResultTankInfo"];
            /** Created At */
            created_at: string;
            /** Analysis Time S */
            analysis_time_s: number;
            video: components["schemas"]["ResultVideoInfo"];
            /** Tank Score */
            tank_score: number;
            /** Level */
            level: string;
            /** Threshold */
            threshold: number;
            /** Fish */
            fish: components["schemas"]["FishResult"][];
            /** Timeline */
            timeline: components["schemas"]["TimelinePoint"][];
            /** Key Moments */
            key_moments: components["schemas"]["KeyMoment"][];
            /** Suggestions */
            suggestions: components["schemas"]["SuggestionItem"][];
            /** Warnings */
            warnings: string[];
            reliability?: components["schemas"]["ReliabilityInfo"];
            detection?: components["schemas"]["DetectionStats"];
            /** Annotated Video Url */
            annotated_video_url: string;
            /** Annotated Video Alt Url */
            annotated_video_alt_url?: string | null;
            /** Disclaimer */
            disclaimer: string;
        };
        /** ResultTankInfo */
        ResultTankInfo: {
            /** Id */
            id: string;
            /** Name */
            name: string;
            /** Goldfish Count */
            goldfish_count: number;
        };
        /** ResultVideoInfo */
        ResultVideoInfo: {
            /** Duration S */
            duration_s: number;
            /** Fps */
            fps: number;
            /** Width */
            width: number;
            /** Height */
            height: number;
            /** View */
            view: string;
        };
        /** ScoringConfigResponse */
        ScoringConfigResponse: {
            /** Threshold */
            threshold: number;
            /** Levels */
            levels: {
                [key: string]: number;
            };
            /** Window S */
            window_s: number;
            /** Sample Hz */
            sample_hz: number;
            /** Zones */
            zones: {
                [key: string]: number;
            };
            /** Speed */
            speed: {
                [key: string]: number;
            };
            /** Direction */
            direction: {
                [key: string]: number;
            };
            /** Isolation */
            isolation: {
                [key: string]: number;
            };
            /** Surface */
            surface: {
                [key: string]: number;
            };
            /** Bottom */
            bottom: {
                [key: string]: number;
            };
            /** Lethargy */
            lethargy: {
                [key: string]: number;
            };
            /** Points */
            points: {
                [key: string]: number;
            };
            /** Tank Formula */
            tank_formula: string;
            /** Rules */
            rules: {
                [key: string]: components["schemas"]["ScoringRuleItem"];
            };
            /** Context Rules */
            context_rules: {
                [key: string]: components["schemas"]["ScoringRuleItem"];
            };
            /** Provenance */
            provenance: string;
        };
        /** ScoringRuleItem */
        ScoringRuleItem: {
            /** Priority */
            priority: string;
            /** Behaviour */
            behaviour: string;
            /** Cause */
            cause: string;
            /** Action */
            action: string;
            /** When */
            when?: string | null;
        };
        /** SuggestionItem */
        SuggestionItem: {
            /** Priority */
            priority: string;
            /** Fish */
            fish: string[];
            /** Behaviour */
            behaviour: string;
            /** Cause */
            cause: string;
            /** Action */
            action: string;
            /**
             * Source
             * @default
             */
            source: string;
            /**
             * Low Confidence
             * @default false
             */
            low_confidence: boolean;
        };
        /** SystemInfoResponse */
        SystemInfoResponse: {
            /** Version */
            version: string;
            /** Analyzer */
            analyzer: string;
            /** External Available */
            external_available: boolean;
            /** Max Upload Mb */
            max_upload_mb: number;
            /** Max Duration S */
            max_duration_s: number;
        };
        /** SystemLimits */
        SystemLimits: {
            /** Max Upload Mb */
            max_upload_mb: number;
            /** Max Duration S */
            max_duration_s: number;
            /** Min Duration S */
            min_duration_s: number;
            /** Job Timeout S */
            job_timeout_s: number;
            /** Max Queue */
            max_queue: number;
        };
        /** SystemStatusResponse */
        SystemStatusResponse: {
            /**
             * Version
             * @default 1.0.0
             */
            version: string;
            /** Mode */
            mode: string;
            detectors: components["schemas"]["DetectorsMap"];
            /** Queue Length */
            queue_length: number;
            limits: components["schemas"]["SystemLimits"];
            /** Uptime S */
            uptime_s: number;
            /** Disk Free Mb */
            disk_free_mb: number;
        };
        /** TankCreate */
        TankCreate: {
            /**
             * Name
             * @description Name of the tank
             */
            name: string;
            /**
             * Volume L
             * @description Volume in litres
             */
            volume_l: number;
            /**
             * Goldfish Count
             * @description Number of goldfish
             */
            goldfish_count: number;
            /**
             * Water Temp C
             * @description Water temperature in Celsius
             */
            water_temp_c?: number | null;
        };
        /** TankOverviewSummary */
        TankOverviewSummary: {
            /** Id */
            id: string;
            /** Name */
            name: string;
            /** Goldfish Count */
            goldfish_count: number;
            /** Volume L */
            volume_l: number;
            /** Latest Score */
            latest_score?: number | null;
            /** Latest Level */
            latest_level?: string | null;
            /** Last Analyzed At */
            last_analyzed_at?: string | null;
            /**
             * Sparkline
             * @default []
             */
            sparkline: number[];
        };
        /** TankResponse */
        TankResponse: {
            /**
             * Name
             * @description Name of the tank
             */
            name: string;
            /**
             * Volume L
             * @description Volume in litres
             */
            volume_l: number;
            /**
             * Goldfish Count
             * @description Number of goldfish
             */
            goldfish_count: number;
            /**
             * Water Temp C
             * @description Water temperature in Celsius
             */
            water_temp_c?: number | null;
            /** Id */
            id: string;
            /** Created At */
            created_at: string;
        };
        /** TankUpdate */
        TankUpdate: {
            /**
             * Name
             * @description Name of the tank
             */
            name?: string | null;
            /**
             * Volume L
             * @description Volume in litres
             */
            volume_l?: number | null;
            /**
             * Goldfish Count
             * @description Number of goldfish
             */
            goldfish_count?: number | null;
            /**
             * Water Temp C
             * @description Water temperature in Celsius
             */
            water_temp_c?: number | null;
        };
        /** TimelinePoint */
        TimelinePoint: {
            /** T */
            t: number;
            /** Score */
            score: number;
        };
        /** TrashItem */
        TrashItem: {
            /** Id */
            id: string;
            /** Tank Id */
            tank_id: string;
            /** Tank Name */
            tank_name: string;
            /** Created At */
            created_at: string;
            /** Deleted At */
            deleted_at: string;
            /** Days Remaining */
            days_remaining: number;
            /** Tank Score */
            tank_score: number;
            /** Level */
            level: string;
        };
        /** ValidationError */
        ValidationError: {
            /** Location */
            loc: (string | number)[];
            /** Message */
            msg: string;
            /** Error Type */
            type: string;
            /** Input */
            input?: unknown;
            /** Context */
            ctx?: Record<string, never>;
        };
        /** VideoUploadResponse */
        VideoUploadResponse: {
            /** Job Id */
            job_id: string;
            /** Video Id */
            video_id: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    health_check_api_v1_health_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
        };
    };
    health_check_health_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
        };
    };
    system_status_api_v1_system_status_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SystemStatusResponse"];
                };
            };
        };
    };
    system_info_api_v1_system_info_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SystemInfoResponse"];
                };
            };
        };
    };
    get_scoring_config_api_v1_config_scoring_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ScoringConfigResponse"];
                };
            };
        };
    };
    get_overview_api_v1_overview_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OverviewResponse"];
                };
            };
        };
    };
    list_tanks_api_v1_tanks_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TankResponse"][];
                };
            };
        };
    };
    create_tank_api_v1_tanks_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TankCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TankResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_tank_api_v1_tanks__tank_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                tank_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TankResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    update_tank_api_v1_tanks__tank_id__put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                tank_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TankUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TankResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    delete_tank_api_v1_tanks__tank_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                tank_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    update_tank_api_v1_tanks__tank_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                tank_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TankUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TankResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    upload_video_api_v1_videos_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["Body_upload_video_api_v1_videos_post"];
            };
        };
        responses: {
            /** @description Successful Response */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VideoUploadResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_job_api_v1_jobs__job_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                job_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["JobResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    cancel_job_api_v1_jobs__job_id__cancel_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                job_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_result_api_v1_results__job_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                job_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ResultResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    delete_result_api_v1_results__job_id__delete: {
        parameters: {
            query?: {
                permanent?: boolean;
            };
            header?: never;
            path: {
                job_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_annotated_video_api_v1_results__job_id__video_get: {
        parameters: {
            query?: {
                format?: string | null;
            };
            header?: never;
            path: {
                job_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_key_frame_api_v1_results__job_id__frames__frame_name__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                job_id: string;
                frame_name: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_pdf_report_api_v1_results__job_id__report_pdf_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                job_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    restore_analysis_api_v1_results__job_id__restore_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                job_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_pdf_report_api_v1_reports__job_id__pdf_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                job_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_history_api_v1_history_get: {
        parameters: {
            query?: {
                tank_id?: string | null;
                page?: number;
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PagedHistory"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_trash_api_v1_trash_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TrashItem"][];
                };
            };
        };
    };
    purge_trash_api_v1_trash_purge_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PurgeResponse"];
                };
            };
        };
    };
    restore_trash_alias_api_v1_trash__job_id__restore_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                job_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_insights_api_v1_insights_get: {
        parameters: {
            query?: {
                tank_id?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InsightsResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_alerts_api_v1_alerts_get: {
        parameters: {
            query?: {
                unread?: boolean | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AlertResponse"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    mark_alert_read_api_v1_alerts__alert_id__read_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                alert_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AlertResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    mark_all_alerts_read_api_v1_alerts_read_all_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
        };
    };
    get_alert_settings_api_v1_settings_alerts_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AlertSettingsResponse"];
                };
            };
        };
    };
    update_alert_settings_api_v1_settings_alerts_put: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AlertSettingsUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AlertSettingsResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_resources_api_v1_resources_get: {
        parameters: {
            query?: {
                /** @description Category filter */
                category?: string | null;
                /** @description Type filter (pdf, video, etc.) */
                type?: string | null;
                /** @description Search query */
                q?: string | null;
                /** @description Featured items filter */
                featured?: boolean | null;
                /** @description Page number */
                page?: number;
                /** @description Items per page */
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_resource_api_v1_resources__resource_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                resource_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    download_resource_file_api_v1_resources__resource_id__file_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                resource_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    preview_resource_api_v1_resources__resource_id__preview_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                resource_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_resource_thumbnail_api_v1_resources__resource_id__thumb_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                resource_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    seed_demo_data_api_v1_demo_seed_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DemoSeedResponse"];
                };
            };
        };
    };
}
