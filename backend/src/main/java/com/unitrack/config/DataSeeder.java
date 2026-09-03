package com.unitrack.config;

import com.unitrack.model.Location;
import com.unitrack.model.QueueStatus;
import com.unitrack.model.Route;
import com.unitrack.model.Stop;
import com.unitrack.repository.LocationRepository;
import com.unitrack.repository.QueueStatusRepository;
import com.unitrack.repository.RouteRepository;
import com.unitrack.repository.StopRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    private final RouteRepository routeRepository;
    private final StopRepository stopRepository;
    private final LocationRepository locationRepository;
    private final QueueStatusRepository queueStatusRepository;

    @Autowired
    public DataSeeder(RouteRepository routeRepository,
                      StopRepository stopRepository,
                      LocationRepository locationRepository,
                      QueueStatusRepository queueStatusRepository) {
        this.routeRepository = routeRepository;
        this.stopRepository = stopRepository;
        this.locationRepository = locationRepository;
        this.queueStatusRepository = queueStatusRepository;
    }

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

    private void seedRoutesAndStops() {
        Route route1 = new Route();
        route1.setName("Main Gate \u2192 Faculty of Science");
        route1.setDescription("Campus transit corridor from Main Gate Terminal to Faculty of Science via University Road");
        routeRepository.save(route1);

        stopRepository.saveAll(List.of(
                createStop(route1, "Main Gate", 6.5178, 3.3854, 1),
                createStop(route1, "Sports Centre", 6.5165, 3.3935, 2),
                createStop(route1, "Faculty of Science", 6.5172, 3.3985, 3)
        ));

        Route route2 = new Route();
        route2.setName("Main Gate \u2192 DLI");
        route2.setDescription("Residential corridor from Main Gate to Distance Learning Institute via New Hall");
        routeRepository.save(route2);

        stopRepository.saveAll(List.of(
                createStop(route2, "Main Gate", 6.5178, 3.3854, 1),
                createStop(route2, "New Hall", 6.5200, 3.3926, 2),
                createStop(route2, "DLI", 6.5119, 3.3921, 3)
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
        location.setLatitude(6.5168);
        location.setLongitude(3.3854);
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
