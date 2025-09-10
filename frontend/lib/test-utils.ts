import { api } from "./api"

// Test utilities for development and debugging
export const testApi = {
  // Test all API endpoints with sample data
  async testAllEndpoints() {
    const testPlaylistUrl = "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"

    console.group("🧪 Testing API Endpoints")

    try {
      console.log("Testing duplicate checker...")
      const duplicateResult = await api.checkDuplicates(testPlaylistUrl)
      console.log("✅ Duplicate checker:", duplicateResult)

      console.log("Testing duplicate deletion...")
      const deletionResult = await api.deleteDuplicates(testPlaylistUrl)
      console.log("✅ Duplicate deletion:", deletionResult)

      console.log("Testing explicit filter...")
      const filterResult = await api.filterExplicitContent(testPlaylistUrl, "metadata")
      console.log("✅ Explicit filter:", filterResult)

      console.log("Testing top tracks...")
      const tracksResult = await api.getTopTracks("4_weeks")
      console.log("✅ Top tracks:", tracksResult)

      console.log("Testing top artists...")
      const artistsResult = await api.getTopArtists("4_weeks")
      console.log("✅ Top artists:", artistsResult)
    } catch (error) {
      console.error("❌ API test failed:", error)
    }

    console.groupEnd()
  },

  // Test error handling
  async testErrorHandling() {
    console.group("🚨 Testing Error Handling")

    try {
      // Test invalid URL
      console.log("Testing invalid playlist URL...")
      const invalidResult = await api.checkDuplicates("invalid-url")
      console.log("Invalid URL result:", invalidResult)

      // Test empty URL
      console.log("Testing empty playlist URL...")
      const emptyResult = await api.checkDuplicates("")
      console.log("Empty URL result:", emptyResult)
    } catch (error) {
      console.error("Error handling test failed:", error)
    }

    console.groupEnd()
  },

  // Performance testing
  async testPerformance() {
    console.group("⚡ Performance Testing")

    const testPlaylistUrl = "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"

    const startTime = performance.now()
    await api.checkDuplicates(testPlaylistUrl)
    const endTime = performance.now()

    console.log(`Duplicate check took ${endTime - startTime} milliseconds`)
    console.groupEnd()
  },
}

// Development helper to run tests in browser console
if (typeof window !== "undefined") {
  ;(window as any).testSpotifyToolsApi = testApi
}
