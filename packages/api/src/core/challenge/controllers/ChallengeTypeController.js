"../../../challenge/repositories/config/ChallengeTypeRepository.js;
""../../../challenge/dtos/ChallengeTypeDTO.js105;
""../../../infra/errors/errorStandardization.js191;
""../../../infra/logging/logger.js284;
'use strict';
/**
 * ChallengeType Controller
 * Responsible for handling challenge type-related API requests
 */
class ChallengeTypeController {
  /**
   * Create a new ChallengeTypeController
   * @param {ChallengeTypeRepository} challengeTypeRepository - Repository for challenge types
   */
  constructor(challengeTypeRepository = null) {
    this.challengeTypeRepository = challengeTypeRepository || new ChallengeTypeRepository();
    this.logger = logger.child({
      controller: 'ChallengeTypeController'
    });
    // Apply standardized error handling to all controller methods
    this.getAllChallengeTypes = withControllerErrorHandling(this.getAllChallengeTypes.bind(this), {
      methodName: 'getAllChallengeTypes',
      domainName: 'challenge',
      logger: this.logger
    });
    this.getChallengeTypeById = withControllerErrorHandling(this.getChallengeTypeById.bind(this), {
      methodName: 'getChallengeTypeById',
      domainName: 'challenge',
      logger: this.logger
    });
    this.getChallengeTypeByCode = withControllerErrorHandling(this.getChallengeTypeByCode.bind(this), {
      methodName: 'getChallengeTypeByCode',
      domainName: 'challenge',
      logger: this.logger
    });
    this.getChallengeTypesByFormat = withControllerErrorHandling(this.getChallengeTypesByFormat.bind(this), {
      methodName: 'getChallengeTypesByFormat',
      domainName: 'challenge',
      logger: this.logger
    });
    this.getChallengeTypesByFocusArea = withControllerErrorHandling(this.getChallengeTypesByFocusArea.bind(this), {
      methodName: 'getChallengeTypesByFocusArea',
      domainName: 'challenge',
      logger: this.logger
    });
    this.createChallengeType = withControllerErrorHandling(this.createChallengeType.bind(this), {
      methodName: 'createChallengeType',
      domainName: 'challenge',
      logger: this.logger
    });
    this.updateChallengeType = withControllerErrorHandling(this.updateChallengeType.bind(this), {
      methodName: 'updateChallengeType',
      domainName: 'challenge',
      logger: this.logger
    });
    this.deleteChallengeType = withControllerErrorHandling(this.deleteChallengeType.bind(this), {
      methodName: 'deleteChallengeType',
      domainName: 'challenge',
      logger: this.logger
    });
  }
  /**
   * Get all challenge types
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllChallengeTypes(req, res) {
    // Get all challenge types from repository
    const challengeTypes = await this.challengeTypeRepository.findAll();
    // Convert to DTOs before sending response
    const challengeTypeDTOs = ChallengeTypeDTOMapper.toDTOCollection(challengeTypes);
    // Return success response
    res.status(200).json({
      success: true,
      count: challengeTypeDTOs.length,
      data: challengeTypeDTOs
    });
  }
  /**
   * Get challenge type by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getChallengeTypeById(req, res) {
    const {
      id
    } = req.params;
    // Get challenge type from repository
    const challengeType = await this.challengeTypeRepository.findById(id);
    // Convert to DTO before sending response
    const challengeTypeDTO = ChallengeTypeDTOMapper.toDTO(challengeType);
    // Return success response
    res.status(200).json({
      success: true,
      data: challengeTypeDTO
    });
  }
  /**
   * Get challenge type by code
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getChallengeTypeByCode(req, res) {
    const {
      code
    } = req.params;
    // Get challenge type from repository
    const challengeType = await this.challengeTypeRepository.findByCode(code);
    // Convert to DTO before sending response
    const challengeTypeDTO = ChallengeTypeDTOMapper.toDTO(challengeType);
    // Return success response
    res.status(200).json({
      success: true,
      data: challengeTypeDTO
    });
  }
  /**
   * Get challenge types by format type
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getChallengeTypesByFormat(req, res) {
    const {
      formatCode
    } = req.params;
    // Get challenge types from repository
    const challengeTypes = await this.challengeTypeRepository.findByFormatType(formatCode);
    // Convert to DTOs before sending response
    const challengeTypeDTOs = ChallengeTypeDTOMapper.toDTOCollection(challengeTypes);
    // Return success response
    res.status(200).json({
      success: true,
      count: challengeTypeDTOs.length,
      data: challengeTypeDTOs
    });
  }
  /**
   * Get challenge types by focus area
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getChallengeTypesByFocusArea(req, res) {
    const {
      focusAreaCode
    } = req.params;
    // Get challenge types from repository
    const challengeTypes = await this.challengeTypeRepository.findByFocusArea(focusAreaCode);
    // Convert to DTOs before sending response
    const challengeTypeDTOs = ChallengeTypeDTOMapper.toDTOCollection(challengeTypes);
    // Return success response
    res.status(200).json({
      success: true,
      count: challengeTypeDTOs.length,
      data: challengeTypeDTOs
    });
  }
  /**
   * Create a new challenge type
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createChallengeType(req, res) {
    // Convert request body to domain parameters
    const domainParams = ChallengeTypeDTOMapper.fromRequest(req.body);
    // Create challenge type
    const challengeType = await this.challengeTypeRepository.save(domainParams);
    // Convert to DTO before sending response
    const challengeTypeDTO = ChallengeTypeDTOMapper.toDTO(challengeType);
    // Return success response
    res.status(201).json({
      success: true,
      data: challengeTypeDTO
    });
  }
  /**
   * Update a challenge type
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateChallengeType(req, res) {
    const {
      code
    } = req.params;
    // Get existing challenge type
    const existingChallengeType = await this.challengeTypeRepository.findByCode(code);
    if (!existingChallengeType) {
      return res.status(404).json({
        success: false,
        message: `Challenge type with code ${code} not found`
      });
    }
    // Convert request body to domain parameters
    const updateParams = ChallengeTypeDTOMapper.fromRequest(req.body);
    // Merge with existing data
    const updatedChallengeType = existingChallengeType.update(updateParams);
    // Save updated challenge type
    const savedChallengeType = await this.challengeTypeRepository.save(updatedChallengeType);
    // Convert to DTO before sending response
    const challengeTypeDTO = ChallengeTypeDTOMapper.toDTO(savedChallengeType);
    // Return success response
    res.status(200).json({
      success: true,
      data: challengeTypeDTO
    });
  }
  /**
   * Delete a challenge type
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteChallengeType(req, res) {
    const {
      code
    } = req.params;
    // Delete challenge type
    const isDeleted = await this.challengeTypeRepository.delete(code);
    // Return success response
    if (isDeleted) {
      res.status(200).json({
        success: true,
        message: `Challenge type with code ${code} deleted successfully`
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Challenge type with code ${code} not found`
      });
    }
  }
}
export default ChallengeTypeController;"