import { kmeans } from 'ml-kmeans'
import { squaredEuclidean } from 'ml-distance-euclidean';

/*
items = [ {embedding: [0, 1, ...], content: "text" } ]
*/
export function cluster(items, numberOfClusters = 5, centers = null) {
    const vectors = items.map(item => {
        return item.embedding
    })

	let options = {}
	if (centers) {
		options = { initialization: centers }
	}

    const clusteringResult = kmeans(vectors, numberOfClusters, options);
    const clusters = getOriginalDataBuckets(clusteringResult, items)
    return clusters
}

function getOriginalDataBuckets(clusteringResult, originalDataItems) {
	const { clusters, centroids } = clusteringResult
	// console.log({ centroids, clusters })
	const clusterMap = {}
	for (let i = 0 ; i < clusters.length; i++) {
		const label = clusters[i]
		const item = originalDataItems[i]
		if (clusterMap[label] == undefined) clusterMap[label] = { items: [] }
		clusterMap[label].items.push(item)
	}
	
	// For each cluster, sort by its distance to the centroid
	for (let i = 0; i < centroids.length; i++) {
		const cluster = clusterMap[i].items
		const centroid = centroids[i]
		// Calculate distances for all items in the cluster
		const distances = cluster.map(item => squaredEuclidean(item.embedding, centroid));

		// Calculate variance
		const mean = distances.reduce((sum, dist) => sum + dist, 0) / distances.length;
		const variance = distances.reduce((sum, dist) => sum + Math.pow(dist - mean, 2), 0) / distances.length;
		clusterMap[i].stdDev = Math.sqrt(variance);

		// Sort cluster items by distance to centroid (closest first)
		cluster.sort((a, b) => {
			const distanceA = squaredEuclidean(a.embedding, centroid);
			const distanceB = squaredEuclidean(b.embedding, centroid);
			return distanceA - distanceB;
		});
		// cluster.sort((a, b) => {
		// 	const distanceA = a.content.length
		// 	const distanceB = b.content.length
		// 	return distanceA - distanceB;
		// });
	}
	// console.log(clusterMap)
	//console.log(squaredEuclidean)

	return Object.values(clusterMap)
}