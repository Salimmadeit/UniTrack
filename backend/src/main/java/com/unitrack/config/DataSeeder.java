package com.unitrack.config;

import com.unitrack.model.Location;
import com.unitrack.model.QueueStatus;
import com.unitrack.model.Route;
import com.unitrack.model.Stop;
import com.unitrack.repository.LocationRepository;
import com.unitrack.repository.QueueStatusRepository;
import com.unitrack.repository.RouteRepository;
import com.unitrack.repository.StopRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final RouteRepository routeRepository;
    private final StopRepository stopRepository;
    private final LocationRepository locationRepository;
    private final QueueStatusRepository queueStatusRepository;

    @Override
    public void run(String... args) {
        if (routeRepository.count() == 0) {
            seedRoutesAndStops();
        }
        if (locationRepository.count() == 0) {
            seedLocation();
        }
        if (queueStatusRepository.count() == 0) {
            seedQueueStatus();
        }
    }

    /**
     * Seeds the two demo routes and their stops.
     *
     * <p>KNOWN ISSUE - the coordinates below are placeholders, not survey data.
     * They step in near-uniform increments (+0.001 lat, +0.002 lng) along a
     * straight diagonal, which is why stops such as New Hall, Sports Centre and
     * the Senate Building render in visibly wrong places. The whole set also sits
     * roughly a kilometre west of the actual Akoka campus centroid (about 6.5164,
     * 3.3967), so the polyline as a whole is offset, not just individual points.
     *
     * <p>Deliberately left as-is rather than replaced with remembered values:
     * plausible-looking coordinates that are quietly wrong are harder to spot than
     * obviously synthetic ones, and a student could go and wait at a stop that is
     * not there. These need to be replaced with verified positions (OSM/Nominatim
     * or Google Maps) before any field test.
     *
     * <p>Note that the stop roster is also incomplete: the student view previously
     * advertised "New Hall" and "Faculty of Engineering", neither of which exists
     * here. That strip is now rendered from GET /routes, so it currently shows the
     * real (shorter) list rather than a fictional one - but the missing stops
     * should be added when the real coordinates are.
     */
    private void seedRoutesAndStops() {
        Route route1 = new Route();
        route1.setName("Main Gate \u2192 Faculty of Science");
        route1.setDescription("Shuttle route from the main entrance to the Faculty of Science complex");
        routeRepository.save(route1);

        stopRepository.saveAll(List.of(
                createStop(route1, "Main Gate", 6.5167, 3.3850, 1),
                createStop(route1, "Sports Centre", 6.5175, 3.3870, 2),
                createStop(route1, "Senate Building", 6.5185, 3.3895, 3),
                createStop(route1, "Main Library", 6.5195, 3.3910, 4),
                createStop(route1, "Faculty of Science", 6.5210, 3.3930, 5)
        ));

        Route route2 = new Route();
        route2.setName("Main Gate \u2192 DLI");
        route2.setDescription("Shuttle route from the main entrance to the Distance Learning Institute");
        routeRepository.save(route2);

        stopRepository.saveAll(List.of(
                createStop(route2, "Main Gate", 6.5167, 3.3850, 1),
                createStop(route2, "Chapel Junction", 6.5180, 3.3865, 2),
                createStop(route2, "Moremi Hall", 6.5200, 3.3880, 3),
                createStop(route2, "DLI Road Junction", 6.5215, 3.3900, 4),
                createStop(route2, "DLI", 6.5230, 3.3920, 5)
        ));
    }

    private Stop createStop(Route route, String name, double lat, double lng, int order) {
        Stop stop = new Stop();
        stop.setRoute(route);
        stop.setName(name);
        stop.setLatitude(lat);
        stop.setLongitude(lng);
        stop.setOrderIndex(order);
        return stop;
    }

    private void seedLocation() {
        Location location = new Location();
        location.setId(1L);
        location.setLatitude(6.5167);
        location.setLongitude(3.3850);
        location.setSpeed(0.0);
        location.setHeading(0.0);
        // Backdated well past the DISCONNECTED threshold so a fresh install
        // honestly reports "no shuttle broadcasting" rather than presenting the
        // seed row as a live vehicle sitting at the main gate.
        location.setUpdatedAt(Instant.now().minus(10, ChronoUnit.MINUTES));
        locationRepository.save(location);
    }

    private void seedQueueStatus() {
        QueueStatus status = new QueueStatus();
        status.setId(1L);
        status.setLevel("LOW");
        status.setSource("DISPATCHER");
        status.setUpdatedAt(Instant.now());
        queueStatusRepository.save(status);
    }
}
